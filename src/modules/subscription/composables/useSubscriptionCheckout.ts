import { useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'

import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { fetchSubscriptionStatus, initiateSubscriptionCheckout } from '../services/subscriptionService'

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
 * polling de GET /subscription/status (no del estado de la orden) porque la
 * fuente de verdad real es el webhook de Payments Core activando el
 * negocio - el resultado que devuelve el widget es solo la respuesta de la
 * pasarela, no la confirmacion. Mismo criterio que Billing.vue del legacy
 * (10 intentos cada 2.5s).
 */
export function useSubscriptionCheckout() {
  const queryClient = useQueryClient()
  const paying = ref(false)
  const error = ref<string | null>(null)
  const verifying = ref(false)
  const activated = ref(false)
  const timedOut = ref(false)

  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let pollCount = 0

  function stopPolling(): void {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = undefined
    }
  }

  async function pollStatus(): Promise<void> {
    try {
      const status = await fetchSubscriptionStatus()
      if (status.status === 'paid') {
        stopPolling()
        verifying.value = false
        activated.value = true
        queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] })
        return
      }
    } catch {
      // Un fallo puntual de red no debe cortar el polling - reintenta igual.
    }

    pollCount += 1
    if (pollCount < MAX_POLLS) {
      pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS)
    } else {
      stopPolling()
      verifying.value = false
      timedOut.value = true
    }
  }

  /** Arranca (o reanuda, ej. tras el redirect de vuelta de Wompi en mobile) el polling. */
  function startPolling(): void {
    pollCount = 0
    verifying.value = true
    activated.value = false
    timedOut.value = false
    pollTimer = setTimeout(pollStatus, POLL_INTERVAL_MS)
  }

  async function pay(customer: { email: string; fullName: string }): Promise<void> {
    paying.value = true
    error.value = null

    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}?wompi_paid=1`
      const intent = await initiateSubscriptionCheckout(redirectUrl)
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
          startPolling()
        } else if (txStatus === 'DECLINED') {
          error.value = 'Tu pago fue rechazado. Verifica los datos de tu tarjeta o intenta con otro método de pago.'
        } else if (txStatus === 'ERROR') {
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

  return { paying, error, verifying, activated, timedOut, pay, startPolling, stop }
}
