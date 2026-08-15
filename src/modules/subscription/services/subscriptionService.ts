import { httpClient } from '@/services/http/client'
import type { ChargeCheckoutResult } from '@/types/paymentSource'
import type { SubscriptionCheckoutIntent, SubscriptionCheckoutStatus, SubscriptionStatusResponse } from '@/types/subscription'

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const { data } = await httpClient.get<SubscriptionStatusResponse>('/subscription/status')
  return data
}

export async function initiateSubscriptionCheckout(
  redirectUrl: string,
  flow: 'widget' | 'api' = 'widget',
): Promise<SubscriptionCheckoutIntent> {
  const { data } = await httpClient.post<SubscriptionCheckoutIntent>('/subscription/checkout', {
    redirect_url: redirectUrl,
    flow,
  })
  return data
}

export async function fetchSubscriptionCheckoutStatus(reference: string): Promise<SubscriptionCheckoutStatus> {
  const { data } = await httpClient.get<SubscriptionCheckoutStatus>(`/subscription/checkout/${reference}`)
  return data
}

// API directa (flow="api"): cobra un intent ya creado con una tarjeta/Nequi
// tokenizados, una fuente de pago guardada, PSE o Boton Bancolombia. El
// `status` que devuelve se queda "pending" a proposito - la confirmacion
// real llega por el webhook del Core, ver fetchSubscriptionCheckoutStatus.
export async function chargeSubscriptionCheckout(
  reference: string,
  paymentMethod: Record<string, unknown>,
): Promise<ChargeCheckoutResult> {
  const { data } = await httpClient.post<ChargeCheckoutResult>(`/subscription/checkout/${reference}/charge`, {
    payment_method: paymentMethod,
  })
  return data
}
