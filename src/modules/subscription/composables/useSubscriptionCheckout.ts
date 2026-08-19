import { useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'

import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { clearPendingCheckoutReference, readPendingCheckoutReference, savePendingCheckoutReference } from './checkoutReferenceStorage'
import { fetchSubscriptionCheckoutStatus, initiateSubscriptionCheckout } from '../services/subscriptionService'

// Wompi carga su propio widget (checkout.wompi.co/widget.js) - no hay tipos
// oficiales, se declara el shape minimo que se usa aca.
declare global {
  interface Window {
    WidgetCheckout?: new (config: Record<string, unknown>) => {
      open: (callback: (result: { transaction?: { status?: string } }) => void) => void
    }
  }
}

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 10

function loadWompiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.WidgetCheckout) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No pudimos cargar la pasarela de pago. Revisa tu conexión a internet.'))
    document.head.appendChild(script)
  })
}

/**
 * Orquesta el pago con Wompi: abre el widget, y tras un pago aprobado hace
 * polling de GET /subscription/checkout/{reference} (el estado de la ORDEN,
 * no el estado general de la suscripcion) porque la fuente de verdad real
 * es el webhook de Payments Core, y solo el estado de la orden distingue
 * "todavia no llega el webhook" de "el webhook llego y el pago fue
 * rechazado" - el resultado que devuelve el widget es solo la respuesta de
 * la pasarela, no la confirmacion. Mismo criterio que Billing.vue del
 * legacy (10 intentos cada 2.5s). La reference se guarda en localStorage
 * (ver checkoutReferenceStorage) porque en mobile Wompi redirige la pagina
 * completa y el estado en memoria se pierde.
 */
export function useSubscriptionCheckout() {
  const queryClient = useQueryClient()
  const paying = ref(false)
  const error = ref<string | null>(null)
  const verifying = ref(false)
  const activated = ref(false)
  const timedOut = ref(false)
  const declined = ref(false)

  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let pollCount = 0

  function stopPolling(): void {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = undefined
    }
  }

  async function pollStatus(reference: string): Promise<void> {
    try {
      const status = await fetchSubscriptionCheckoutStatus(reference)
      if (status.status === 'confirmed') {
        stopPolling()
        clearPendingCheckoutReference()
        verifying.value = false
        activated.value = true
        queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] })
        return
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        stopPolling()
        clearPendingCheckoutReference()
        verifying.value = false
        declined.value = true
        return
      }
    } catch {
      // Un fallo puntual de red no debe cortar el polling - reintenta igual.
    }

    pollCount += 1
    if (pollCount < MAX_POLLS) {
      pollTimer = setTimeout(() => pollStatus(reference), POLL_INTERVAL_MS)
    } else {
      stopPolling()
      verifying.value = false
      timedOut.value = true
    }
  }

  /**
   * Arranca (o reanuda, ej. tras el redirect de vuelta de Wompi en mobile)
   * el polling. Sin argumento, toma la reference pendiente de
   * localStorage - asi funciona igual llamado desde `pay()` (misma carga de
   * la pagina) que desde el fallback de mount tras el redirect (pagina
   * nueva, sin memoria del intent).
   */
  function startPolling(reference?: string): void {
    const ref_ = reference ?? readPendingCheckoutReference()
    if (!ref_) {
      return
    }
    pollCount = 0
    verifying.value = true
    activated.value = false
    timedOut.value = false
    declined.value = false
    pollTimer = setTimeout(() => pollStatus(ref_), POLL_INTERVAL_MS)
  }

  async function pay(customer: { email: string; fullName: string }): Promise<void> {
    paying.value = true
    error.value = null
    declined.value = false

    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}?wompi_paid=1`
      const intent = await initiateSubscriptionCheckout(redirectUrl)
      savePendingCheckoutReference(intent.order_key)
      await loadWompiScript()

      const checkout = new window.WidgetCheckout!({
        currency: 'COP',
        amountInCents: intent.checkout.amount_in_cents,
        reference: intent.checkout.reference,
        publicKey: intent.checkout.public_key,
        signature: { integrity: intent.checkout.integrity_signature },
        redirectUrl,
        customerData: { email: customer.email, fullName: customer.fullName },
      })

      paying.value = false

      checkout.open((result) => {
        const txStatus = result.transaction?.status
        if (txStatus === 'APPROVED') {
          // No mostrar exito todavia - eso lo confirma el webhook, no el widget.
          startPolling(intent.order_key)
        } else if (txStatus === 'DECLINED') {
          clearPendingCheckoutReference()
          error.value = 'Tu pago fue rechazado. Verifica los datos de tu tarjeta o intenta con otro método de pago.'
        } else if (txStatus === 'ERROR') {
          clearPendingCheckoutReference()
          error.value = 'Ocurrió un error al procesar el pago. Intenta de nuevo en unos minutos.'
        }
      })
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos conectar con el sistema de pagos. Intenta de nuevo.')
      paying.value = false
    }
  }

  function stop(): void {
    stopPolling()
  }

  return { paying, error, verifying, activated, timedOut, declined, pay, startPolling, stop }
}
