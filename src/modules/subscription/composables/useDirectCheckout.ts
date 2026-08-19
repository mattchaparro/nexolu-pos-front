import { useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'

import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { clearPendingCheckoutReference, readPendingCheckoutReference, savePendingCheckoutReference } from './checkoutReferenceStorage'
import { createPaymentSource } from '../services/paymentSourcesService'
import { chargeSubscriptionCheckout, fetchSubscriptionCheckoutStatus, initiateSubscriptionCheckout } from '../services/subscriptionService'
import { type CardInput, fetchNequiTokenStatus, tokenizeCard, tokenizeNequi } from '../services/wompiTokenization'

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 10
const NEQUI_APPROVAL_POLL_INTERVAL_MS = 3000
// ~60s esperando a que el usuario acepte la suscripcion Nequi en su celular.
const NEQUI_APPROVAL_MAX_POLLS = 20

export interface PseChargeInput {
  financial_institution_code: string
  user_type: number
  user_legal_id_type: string
  user_legal_id: string
  customer_full_name: string
  customer_phone_number: string
}

/**
 * Orquesta el pago DIRECTO (flow="api"), sin abrir el widget de Wompi -
 * tarjeta/Nequi (nuevos o una fuente ya guardada), PSE y Boton Bancolombia.
 * Convive con useSubscriptionCheckout (flujo Widget legado, sin tocar) -
 * ver docs/PLAN_METODOS_PAGO_ALTERNOS.md (repo nexolu-pos-api).
 *
 * Mismo criterio que el flujo Widget para la confirmacion: nunca se confia
 * en la respuesta sincrona del charge, siempre se espera el webhook real -
 * polling de GET /subscription/checkout/{reference} (el estado de la ORDEN,
 * no el estado general de la suscripcion), igual que useSubscriptionCheckout.
 * La reference se guarda en localStorage (ver checkoutReferenceStorage)
 * porque PSE/Boton Bancolombia redirigen la pagina completa al banco y de
 * vuelta - el estado en memoria se pierde.
 */
export function useDirectCheckout() {
  const queryClient = useQueryClient()
  const paying = ref(false)
  const error = ref<string | null>(null)
  const verifying = ref(false)
  const activated = ref(false)
  const timedOut = ref(false)
  const declined = ref(false)
  const waitingNequiApproval = ref(false)

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

  /** Sin argumento, toma la reference pendiente de localStorage (fallback tras redirect de PSE/Bancolombia). */
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

  function redirectUrl(): string {
    return `${window.location.origin}${window.location.pathname}?wompi_paid=1`
  }

  async function waitForNequiApproval(publicKey: string, tokenId: string): Promise<void> {
    waitingNequiApproval.value = true
    try {
      for (let attempt = 0; attempt < NEQUI_APPROVAL_MAX_POLLS; attempt += 1) {
        const status = await fetchNequiTokenStatus(publicKey, tokenId)
        if (status === 'APPROVED') {
          return
        }
        if (status !== 'PENDING') {
          throw new Error('Tu banco rechazó la suscripción de Nequi.')
        }
        await new Promise((resolve) => setTimeout(resolve, NEQUI_APPROVAL_POLL_INTERVAL_MS))
      }
      throw new Error('No recibimos la aprobación en Nequi a tiempo. Intenta de nuevo.')
    } finally {
      waitingNequiApproval.value = false
    }
  }

  async function finishCharge(reference: string, paymentMethod: Record<string, unknown>): Promise<void> {
    // Guardar la reference ANTES del charge: si es PSE/Bancolombia, la
    // siguiente linea puede terminar en una navegacion completa al banco.
    savePendingCheckoutReference(reference)
    const result = await chargeSubscriptionCheckout(reference, paymentMethod)
    if (result.redirect_url) {
      // PSE/Boton Bancolombia: el usuario tiene que terminar el pago en el
      // sitio de su banco. Al volver, redirect_url ya trae ?wompi_paid=1
      // (ver payWithPse/payWithBancolombiaTransfer) para que SubscriptionView
      // reanude el polling al montar (toma la reference de localStorage).
      window.location.href = result.redirect_url
      return
    }
    startPolling(reference)
  }

  /** Paga reusando una fuente de pago ya guardada - sin tokenizar nada de nuevo. */
  async function payWithSavedSource(paymentSourceId: string, installments = 1): Promise<void> {
    paying.value = true
    error.value = null
    declined.value = false
    try {
      const intent = await initiateSubscriptionCheckout(redirectUrl(), 'api')
      await finishCharge(intent.order_key, {
        type: 'PAYMENT_SOURCE',
        payment_source_id: paymentSourceId,
        installments,
      })
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos procesar el pago. Intenta de nuevo.')
    } finally {
      paying.value = false
    }
  }

  /** Tarjeta nueva. `saveLabel` truthy = ademas la guarda como fuente de pago reusable. */
  async function payWithNewCard(card: CardInput, saveLabel: string | null): Promise<void> {
    paying.value = true
    error.value = null
    declined.value = false
    try {
      const intent = await initiateSubscriptionCheckout(redirectUrl(), 'api')
      if (!intent.payment_init) {
        throw new Error('No se pudo iniciar el pago directo.')
      }

      const token = await tokenizeCard(intent.payment_init.public_key, card)

      if (saveLabel) {
        const source = await createPaymentSource({
          type: 'CARD',
          token: token.id,
          label: saveLabel,
        })
        queryClient.invalidateQueries({ queryKey: ['payment-sources'] })
        await finishCharge(intent.order_key, { type: 'PAYMENT_SOURCE', payment_source_id: source.payment_source_id })
      } else {
        await finishCharge(intent.order_key, { type: 'CARD', token: token.id })
      }
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos procesar tu tarjeta. Verifica los datos e intenta de nuevo.')
    } finally {
      paying.value = false
    }
  }

  /** Nequi nuevo. `save` true = tokeniza para reuso (espera aprobacion en el celular); false = cobro de una sola vez. */
  async function payWithNewNequi(phoneNumber: string, save: boolean, label: string): Promise<void> {
    paying.value = true
    error.value = null
    declined.value = false
    try {
      const intent = await initiateSubscriptionCheckout(redirectUrl(), 'api')
      if (!intent.payment_init) {
        throw new Error('No se pudo iniciar el pago directo.')
      }

      if (save) {
        const token = await tokenizeNequi(intent.payment_init.public_key, phoneNumber)
        await waitForNequiApproval(intent.payment_init.public_key, token.id)
        const source = await createPaymentSource({ type: 'NEQUI', token: token.id, label })
        queryClient.invalidateQueries({ queryKey: ['payment-sources'] })
        await finishCharge(intent.order_key, { type: 'PAYMENT_SOURCE', payment_source_id: source.payment_source_id })
      } else {
        await finishCharge(intent.order_key, { type: 'NEQUI', phone_number: phoneNumber })
      }
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos procesar el pago con Nequi. Intenta de nuevo.')
    } finally {
      paying.value = false
    }
  }

  async function payWithPse(payload: PseChargeInput): Promise<void> {
    paying.value = true
    error.value = null
    declined.value = false
    try {
      const intent = await initiateSubscriptionCheckout(redirectUrl(), 'api')
      await finishCharge(intent.order_key, {
        type: 'PSE',
        payment_description: 'Suscripcion Nexolu',
        ...payload,
      })
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos iniciar el pago por PSE. Intenta de nuevo.')
    } finally {
      paying.value = false
    }
  }

  async function payWithBancolombiaTransfer(): Promise<void> {
    paying.value = true
    error.value = null
    declined.value = false
    try {
      const intent = await initiateSubscriptionCheckout(redirectUrl(), 'api')
      await finishCharge(intent.order_key, {
        type: 'BANCOLOMBIA_TRANSFER',
        payment_description: 'Suscripcion Nexolu',
        ecommerce_url: redirectUrl(),
      })
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos iniciar el pago con Bancolombia. Intenta de nuevo.')
    } finally {
      paying.value = false
    }
  }

  function stop(): void {
    stopPolling()
  }

  return {
    paying,
    error,
    verifying,
    activated,
    timedOut,
    declined,
    waitingNequiApproval,
    payWithSavedSource,
    payWithNewCard,
    payWithNewNequi,
    payWithPse,
    payWithBancolombiaTransfer,
    startPolling,
    stop,
  }
}

export type DirectCheckout = ReturnType<typeof useDirectCheckout>
