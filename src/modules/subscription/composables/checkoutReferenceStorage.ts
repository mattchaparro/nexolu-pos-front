// La `reference` (order_key) de un checkout en curso vive en localStorage,
// no en memoria del composable: en mobile, Wompi/el banco (PSE, Bancolombia)
// hacen una navegacion completa fuera de la SPA y de vuelta - el estado en
// memoria se pierde, pero localStorage sobrevive. useSubscriptionCheckout y
// useDirectCheckout comparten esta misma llave a proposito: solo puede haber
// un checkout de suscripcion en curso a la vez por usuario.
const STORAGE_KEY = 'nexolu:pos:pending-subscription-checkout-reference'

export function savePendingCheckoutReference(reference: string): void {
  localStorage.setItem(STORAGE_KEY, reference)
}

export function readPendingCheckoutReference(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function clearPendingCheckoutReference(): void {
  localStorage.removeItem(STORAGE_KEY)
}
