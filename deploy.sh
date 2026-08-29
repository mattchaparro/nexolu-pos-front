#!/bin/bash
# Deploy de pos-front en el patron de PRODUCCION: build estatico servido
# directo por el nginx del host (ver nexolu-infra/nginx/new-pos.nexolu.co.conf).
#
# Tres propiedades que este script garantiza, y por que existen:
#
#   1. EL BUILD NO PUEDE TUMBAR EL DROPLET. Corre dentro de un contenedor
#      con tope de memoria duro, no en el host. El 2026-08-28 la version
#      anterior (`npm install && npm run build` a pelo sobre el host) agoto
#      los 2 GB del droplet: sin swap ni limites por cgroup, en vez de que
#      el OOM killer matara solo a node se colgo la maquina entera y se
#      llevo puestos MySQL, pos-api y nginx - los negocios ya migrados
#      quedaron sin servicio ~9 minutos hasta un power-cycle. Con el tope,
#      un build que se pase muere solo el, el deploy falla limpio y el sitio
#      sigue sirviendo la version anterior. Ver docs/DEPLOY_POS_FRONT.md en
#      nexolu-infra.
#
#   2. EL CLIENTE NUNCA VE UN BUILD A MEDIAS. Antes el build escribia
#      DENTRO de dist/, que es exactamente el directorio que nginx estaba
#      sirviendo: durante el minuto y medio de build, quien entrara recibia
#      una app rota. Ahora cada build va a releases/<timestamp>/ y recien
#      al final se cambia el symlink `current` de golpe (rename atomico).
#      Por eso no hace falta ni ventana nocturna ni banner de mantenimiento.
#
#   3. SE PUEDE VOLVER ATRAS. Se conservan las ultimas RETENER releases;
#      `./deploy.sh rollback` reapunta `current` a la anterior en un
#      instante, sin rebuild.
#
# Este script es especifico de droplets con el vhost de nginx ya armado
# (produccion). En SG (staging) pos-front corre distinto, como dev server de
# Vite en un contenedor con bind mount (ver nexolu-infra/docs/STAGING_SG.md)
# y NO usa este script - deploy-menu.sh detecta cual patron aplica antes de
# llamarlo. No lo corras a mano en un droplet de SG.
set -euo pipefail

cd "$(dirname "$0")"
APP_DIR="$(pwd)"

RELEASES_DIR="$APP_DIR/releases"
CURRENT_LINK="$APP_DIR/current"
PREVIOUS_LINK="$APP_DIR/previous"
RETENER="${RETENER:-3}"

# Imagen de build: fija a la major de Node del droplet para que el build en
# contenedor no difiera del que corrias antes en el host.
NODE_IMAGE="${NODE_IMAGE:-node:22-alpine}"

# Topes de memoria del contenedor de build. MEM_LIMIT es RAM real;
# MEM_SWAP_LIMIT es RAM+swap (Docker lo define asi, no es swap adicional).
# Dejar MEM_SWAP_LIMIT > MEM_LIMIT permite que un build pesado desborde a
# swap - lento pero termina - en vez de morir. El resto del droplet
# (MySQL, pos-api, redis) queda fuera de este cgroup y no se ve afectado
# pase lo que pase acá.
MEM_LIMIT="${MEM_LIMIT:-1200m}"
MEM_SWAP_LIMIT="${MEM_SWAP_LIMIT:-2400m}"
# Techo del heap de V8, por debajo de MEM_LIMIT: hace que Node haga GC
# agresivo en vez de crecer hasta chocar contra el limite del cgroup.
NODE_HEAP_MB="${NODE_HEAP_MB:-1024}"

log() { echo "[pos-front] $*"; }
fallar() { echo "[pos-front] ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# rollback: reapunta `current` a la release anterior. No reconstruye nada.
# ---------------------------------------------------------------------------
rollback() {
    [ -L "$PREVIOUS_LINK" ] || fallar "no hay release anterior registrada (falta $PREVIOUS_LINK)."
    local destino
    destino="$(readlink -f "$PREVIOUS_LINK")"
    [ -f "$destino/index.html" ] || fallar "la release anterior ($destino) no tiene index.html."

    local actual
    actual="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

    log "Volviendo a $(basename "$destino")..."
    apuntar "$CURRENT_LINK" "$destino"
    [ -n "$actual" ] && apuntar "$PREVIOUS_LINK" "$actual"
    log "Listo. current -> $(basename "$destino")"
    verificar
}

# ---------------------------------------------------------------------------
# Cambio de symlink atomico: `ln -sfn` sobre un symlink existente NO es
# atomico (borra y recrea, hay una ventana sin destino). Crear aparte y
# `mv -T` si lo es - es un rename(2), el cliente ve una version o la otra,
# nunca un 404 intermedio.
# ---------------------------------------------------------------------------
apuntar() {
    local link="$1" destino="$2"
    ln -sfn "$destino" "${link}.nuevo"
    mv -T "${link}.nuevo" "$link"
}

# ---------------------------------------------------------------------------
# bootstrap: migra un droplet que todavia sirve el dist/ viejo al esquema de
# releases, SIN caida. Copia el dist actual como release inicial y crea los
# symlinks, para que se pueda cambiar el root de nginx a `current` sirviendo
# exactamente los mismos bytes que ya estaba sirviendo. Recien despues de
# eso es seguro correr un deploy normal (que arranca borrando dist/).
# Idempotente: si `current` ya existe, no hace nada.
# ---------------------------------------------------------------------------
bootstrap() {
    if [ -L "$CURRENT_LINK" ]; then
        log "Ya migrado al esquema de releases, no hay nada que hacer."
        estado
        return 0
    fi
    [ -f "$APP_DIR/dist/index.html" ] || fallar "no hay dist/index.html para tomar como release inicial."

    local inicial="$RELEASES_DIR/$(date +%Y%m%d-%H%M%S)-bootstrap"
    mkdir -p "$RELEASES_DIR"
    cp -a "$APP_DIR/dist" "$inicial"
    apuntar "$CURRENT_LINK" "$inicial"
    apuntar "$PREVIOUS_LINK" "$inicial"

    log "Release inicial creada desde el dist/ actual: $(basename "$inicial")"
    log "AHORA cambiar el root de nginx a $CURRENT_LINK y recargar; despues ya se puede correr un deploy normal."
    estado
}

estado() {
    log "current  -> $(readlink -f "$CURRENT_LINK" 2>/dev/null || echo '(sin definir)')"
    log "previous -> $(readlink -f "$PREVIOUS_LINK" 2>/dev/null || echo '(sin definir)')"
    if [ -d "$RELEASES_DIR" ]; then
        log "releases guardadas:"
        ls -1t "$RELEASES_DIR" | sed 's/^/           /'
    fi
}

verificar() {
    local codigo
    codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://new-pos.nexolu.co/ 2>/dev/null || echo 000)"
    log "curl https://new-pos.nexolu.co/ -> $codigo"
    [ "$codigo" = "200" ] || log "AVISO: no devolvio 200. Revisar nginx y, si hace falta, ./deploy.sh rollback"
}

# ---------------------------------------------------------------------------
# Deploy completo.
# ---------------------------------------------------------------------------
desplegar() {
    command -v docker >/dev/null || fallar "docker no esta instalado en este droplet; el build corre en contenedor a proposito."

    log "==> git pull"
    git pull origin main

    local release_dir
    release_dir="$RELEASES_DIR/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$RELEASES_DIR"

    log "==> build en contenedor ($NODE_IMAGE, mem=$MEM_LIMIT, swap total=$MEM_SWAP_LIMIT, heap=${NODE_HEAP_MB}m)"
    # --user root: el checkout del droplet es de root, y node_modules ya
    #   quedo root-owned de las corridas viejas en el host. Correr como otro
    #   uid rompe npm ci con EACCES.
    # npm ci (no npm install): instala exactamente el package-lock.json, sin
    #   resolver versiones nuevas en medio de un deploy de produccion.
    # El build escribe en dist/ dentro del repo (default de Vite) y despues
    #   lo movemos a la release - no se toca `current` hasta el final.
    if ! docker run --rm \
        --name pos-front-build \
        --user root \
        --memory "$MEM_LIMIT" \
        --memory-swap "$MEM_SWAP_LIMIT" \
        -e NODE_OPTIONS="--max-old-space-size=${NODE_HEAP_MB}" \
        -e CI=true \
        -v "$APP_DIR":/app \
        -w /app \
        "$NODE_IMAGE" \
        sh -c 'rm -rf dist && npm ci --no-audit --no-fund && npm run build'
    then
        fallar "el build fallo (o lo mato el limite de memoria). NO se toco 'current': el sitio sigue sirviendo la version anterior."
    fi

    [ -f "$APP_DIR/dist/index.html" ] || fallar "el build termino sin error pero no dejo dist/index.html."

    log "==> publicando release $(basename "$release_dir")"
    # mv del directorio entero, no de su contenido: un glob se saltea los
    # dotfiles que Vite puede dejar (.vite/, .htaccess de public/).
    mv "$APP_DIR/dist" "$release_dir"

    # previous apunta a lo que estaba sirviendose HASTA este momento, para
    # que rollback y el fallback de assets viejos de nginx tengan a donde ir.
    local anterior
    anterior="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
    apuntar "$CURRENT_LINK" "$release_dir"
    if [ -n "$anterior" ] && [ -d "$anterior" ]; then
        apuntar "$PREVIOUS_LINK" "$anterior"
    else
        # Primer deploy con este esquema: previous apunta a la misma release
        # para que el location @anterior de nginx siempre resuelva.
        apuntar "$PREVIOUS_LINK" "$release_dir"
    fi

    log "==> limpiando releases viejas (se conservan $RETENER)"
    # Nunca borrar lo que current/previous estan usando, pase lo que pase
    # con el orden por fecha.
    local proteger
    proteger="$(readlink -f "$CURRENT_LINK"):$(readlink -f "$PREVIOUS_LINK")"
    ls -1t "$RELEASES_DIR" | tail -n +"$((RETENER + 1))" | while read -r vieja; do
        case "$proteger" in
            *"$RELEASES_DIR/$vieja"*) continue ;;
        esac
        log "    borrando $vieja"
        rm -rf "${RELEASES_DIR:?}/$vieja"
    done

    estado
    verificar
    log "Listo. nginx sirve la release nueva desde 'current' (cambio atomico, sin ventana de caida)."
}

case "${1:-deploy}" in
    deploy)    desplegar ;;
    rollback)  rollback ;;
    status)    estado ;;
    bootstrap) bootstrap ;;
    *) echo "Uso: $0 [deploy|rollback|status|bootstrap]"; exit 1 ;;
esac
