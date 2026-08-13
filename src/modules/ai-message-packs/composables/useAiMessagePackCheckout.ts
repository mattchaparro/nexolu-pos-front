import { useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'

import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { fetchAiQuotaState, initiateAiMessagePackCheckout } from '../services/aiMessagePackService'

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
const BALANCE_BEFORE_STORAGE_KEY = 'ai_message_pack_balance_before_purchase'

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
 * Orquesta el pago con Wompi de un paquete de mensajes de IA - mismo patron
 * que useSubscriptionCheckout (widget de Wompi + polling tras un pago
 * aprobado), pero sin un "status" global que confirme el pago: en su lugar
 * se compara el pack_balance actual contra el que habia antes de comprar
 * (guardado en sessionStorage para sobrevivir al redirect-back de Wompi en
 * mobile), hasta que el webhook de Payments Core lo incremente.
 */
export function useAiMessagePackCheckout() {
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

  async function pollStatus(balanceBefore: number): Promise<void> {
    try {
      const state = await fetchAiQuotaState()
      if (state.pack_balance > balanceBefore) {
        stopPolling()
        sessionStorage.removeItem(BALANCE_BEFORE_STORAGE_KEY)
        verifying.value = false
        activated.value = true
        queryClient.invalidateQueries({ queryKey: ['ai-message-packs', 'state'] })
        return
      }
    } catch {
      // Un fallo puntual de red no debe cortar el polling - reintenta igual.
    }

    pollCount += 1
    if (pollCount < MAX_POLLS) {
      pollTimer = setTimeout(() => pollStatus(balanceBefore), POLL_INTERVAL_MS)
    } else {
      stopPolling()
      sessionStorage.removeItem(BALANCE_BEFORE_STORAGE_KEY)
      verifying.value = false
      timedOut.value = true
    }
  }

  /** Arranca (o reanuda, ej. tras el redirect de vuelta de Wompi en mobile) el polling. */
  function startPolling(balanceBefore: number): void {
    pollCount = 0
    verifying.value = true
    activated.value = false
    timedOut.value = false
    pollTimer = setTimeout(() => pollStatus(balanceBefore), POLL_INTERVAL_MS)
  }

  /** Reanuda el polling tras el redirect-back de Wompi (mobile), usando el balance guardado antes de abrir el widget. */
  function resumePollingFromRedirect(): void {
    const stored = sessionStorage.getItem(BALANCE_BEFORE_STORAGE_KEY)
    if (stored === null) {
      return
    }
    startPolling(Number(stored))
  }

  async function pay(customer: { email: string; fullName: string }, currentBalance: number): Promise<void> {
    paying.value = true
    error.value = null

    try {
      sessionStorage.setItem(BALANCE_BEFORE_STORAGE_KEY, String(currentBalance))

      const redirectUrl = `${window.location.origin}${window.location.pathname}?wompi_pack_paid=1`
      const intent = await initiateAiMessagePackCheckout(redirectUrl)
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
          startPolling(currentBalance)
        } else if (txStatus === 'DECLINED') {
          sessionStorage.removeItem(BALANCE_BEFORE_STORAGE_KEY)
          error.value = 'Tu pago fue rechazado. Verifica los datos de tu tarjeta o intenta con otro método de pago.'
        } else if (txStatus === 'ERROR') {
          sessionStorage.removeItem(BALANCE_BEFORE_STORAGE_KEY)
          error.value = 'Ocurrió un error al procesar el pago. Intenta de nuevo en unos minutos.'
        }
      })
    } catch (e) {
      sessionStorage.removeItem(BALANCE_BEFORE_STORAGE_KEY)
      error.value = extractErrorMessage(e, 'No pudimos conectar con el sistema de pagos. Intenta de nuevo.')
      paying.value = false
    }
  }

  function stop(): void {
    stopPolling()
  }

  return { paying, error, verifying, activated, timedOut, pay, resumePollingFromRedirect, stop }
}
