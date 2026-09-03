import { httpClient } from '@/services/http/client'
import type { PaymentGatewayProvider, PaymentGatewayTest } from '@/types/paymentGateway'

export async function fetchPaymentGateways(): Promise<PaymentGatewayProvider[]> {
  const { data } = await httpClient.get<{ providers: PaymentGatewayProvider[] }>(
    '/payment-gateways',
  )
  return data.providers
}

export async function connectPaymentGateway(payload: {
  provider_slug: string
  environment: string
  credentials: Record<string, string>
}): Promise<void> {
  await httpClient.post('/payment-gateways', payload)
}

/**
 * Comprueba que las llaves sirven, sin cobrarle a nadie.
 *
 * Existe porque "Conectado" solo significa "hay algo guardado": sin esto el
 * comerciante se enteraba de que las llaves estaban mal con el primer
 * comprador que no pudo pagar.
 */
export async function testPaymentGateway(provider: string): Promise<PaymentGatewayTest> {
  const { data } = await httpClient.post<PaymentGatewayTest>(`/payment-gateways/${provider}/test`)
  return data
}

export async function disconnectPaymentGateway(provider: string): Promise<void> {
  await httpClient.delete(`/payment-gateways/${provider}`)
}
