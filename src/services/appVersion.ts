/**
 * Detecta que esta pestana quedo corriendo una version vieja de la app.
 *
 * nginx le sigue sirviendo a una pestana abierta los assets de la release
 * anterior (ver nexolu-infra/nginx/new-pos.nexolu.co.conf) para que un
 * deploy no la rompa. El costo: una tablet de mostrador que nunca recarga se
 * queda para siempre en la version con la que abrio - Central Cell siguio
 * viendo el buscador de clientes viejo en "Editar orden" 20 minutos despues
 * de desplegado el cambio (2026-09-27).
 *
 * El router pregunta aca antes de cada navegacion; si hay build nuevo, en vez
 * de navegar dentro de la SPA hace una carga completa de la ruta destino.
 * Solo al navegar: recargar a mitad de una pantalla (con un carrito o un
 * formulario a medio llenar) perderia lo que el usuario tenia.
 */

const CHECK_INTERVAL_MS = 60_000
const REQUEST_TIMEOUT_MS = 3_000

let lastCheckAt = 0
let newerBuildDeployed = false

export async function isNewerBuildDeployed(): Promise<boolean> {
  if (import.meta.env.DEV || newerBuildDeployed) {
    return newerBuildDeployed
  }

  const now = Date.now()
  if (now - lastCheckAt < CHECK_INTERVAL_MS) {
    return false
  }
  lastCheckAt = now

  // Con red lenta la navegacion no puede quedar colgada esperando esto.
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`/version.json?t=${now}`, { cache: 'no-store', signal: controller.signal })
    if (response.ok) {
      const { buildId } = (await response.json()) as { buildId?: unknown }
      newerBuildDeployed = typeof buildId === 'string' && buildId !== __APP_BUILD_ID__
    }
  } catch {
    // Sin red o sin version.json: seguir con la version actual.
  } finally {
    window.clearTimeout(timeout)
  }

  return newerBuildDeployed
}

const PRELOAD_RELOAD_KEY = 'nexolu_preload_reload_at'

/**
 * Una pestana muy vieja puede pedir un chunk que ya no esta ni en la release
 * actual ni en la anterior (deploy.sh borra las viejas): sin esto la pantalla
 * queda en blanco. Recargar trae el index.html nuevo. El sessionStorage evita
 * un bucle si el chunk faltara tambien en el build nuevo.
 */
export function reloadOnMissingChunks(): void {
  window.addEventListener('vite:preloadError', (event) => {
    let lastReloadAt = 0
    try {
      lastReloadAt = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0)
    } catch {
      // sessionStorage bloqueado: igual se intenta una vez.
    }
    if (Date.now() - lastReloadAt < 10_000) {
      return
    }
    event.preventDefault()
    try {
      sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()))
    } catch {
      // idem
    }
    window.location.reload()
  })
}
