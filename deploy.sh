#!/bin/bash
# Deploy de ESTE servicio para el patron de PRODUCCION: build estatico
# servido directo por nginx del host (ver nginx/new-pos.nexolu.co.conf,
# root apuntando a este dist/) - sin contenedor propio, el repo todavia no
# tiene Dockerfile. `npm run build` dejando dist/ actualizado es todo lo
# que hace falta: nginx sirve los archivos nuevos en la proxima request,
# no hace falta reiniciar ni recargar nada.
#
# Este patron es especifico de droplets con el vhost de nginx ya armado
# (produccion) - en SG (staging) pos-front corre distinto, como dev server
# de Vite en un contenedor con bind mount sobre el codigo fuente (ver
# nexolu-infra/docs/STAGING_SG.md) y no usa este script. deploy-menu.sh
# detecta cual de los dos patrones aplica en cada droplet antes de llamar
# a este script - no lo llames a mano en un droplet de SG.
set -e
cd "$(dirname "$0")"

echo "==> git pull"
git pull origin main

echo "==> npm install"
npm install

echo "==> npm run build"
npm run build

echo "==> Listo. nginx ya sirve el build nuevo de dist/. Verificar: curl -s https://new-pos.nexolu.co/"
