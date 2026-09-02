import router from '@/router'
import { useAuthStore } from '@/stores/auth.store'
import { useFlashStore } from '@/stores/flash.store'

/**
 * Qué hacer cuando la API dice que la sesión ya no vale (401).
 *
 * Vive aparte del interceptor de axios porque hay DOS caminos hacia la API:
 * httpClient (todo lo normal) y el `fetch` a mano del chat con IA, que no
 * puede usar axios porque necesita leer la respuesta como stream. Antes esto
 * solo existía en el interceptor, así que un token vencido a mitad de una
 * conversación dejaba al usuario viendo "no pudimos procesar el mensaje" y
 * la app aparentemente normal, en vez de sacarlo al login como en cualquier
 * otra pantalla.
 *
 * clearSession() y no solo tokenStorage.clear(): el guard del router
 * devuelve a home si `to.name === 'login'` y el store sigue autenticado, e
 * `isAuthenticated` se calcula del token en memoria de Pinia, no de
 * localStorage - limpiar solo el storage hacía que el push a login rebotara
 * de inmediato (bug reportado: la alerta salía pero la app seguía navegable
 * como logueado).
 */
export function handleExpiredSession(): void {
  if (router.currentRoute.value.name === 'login') {
    return
  }

  useAuthStore().clearSession()
  useFlashStore().set('Tu sesión expiró. Inicia sesión de nuevo.', 'warn')
  router.push({ name: 'login' })
}
