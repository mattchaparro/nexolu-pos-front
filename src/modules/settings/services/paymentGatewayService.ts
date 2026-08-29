import { httpClient } from '@/services/http/client'
import type { PaymentGatewayProvider } from '@/types/paymentGateway'

export async function fetchPaymentGateways(): Promise<PaymentGatewayProvider[]> {
  const { data } = await httpClient.get<{ providers: PaymentGatewayProvider[] }>('/payment-gateways')
  return data.providers
}

export async function connectPaymentGateway(payload: {
  provider_slug: string
  environment: string
  credentials: Record<string, string>
}): Promise<void> {
  await httpClient.post('/payment-gateways', payload)
}

export async function disconnectPaymentGateway(provider: string): Promise<void> {
  await httpClient.delete(`/payment-gateways/${provider}`)
}
