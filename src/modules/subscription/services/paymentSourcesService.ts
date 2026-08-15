import { httpClient } from '@/services/http/client'
import type { PaymentSource, PaymentSourceType } from '@/types/paymentSource'

export async function fetchPaymentSources(): Promise<PaymentSource[]> {
  const { data } = await httpClient.get<{ payment_sources: PaymentSource[] }>('/payment-sources')
  return data.payment_sources
}

export async function createPaymentSource(payload: {
  type: PaymentSourceType
  token: string
  label: string
}): Promise<PaymentSource> {
  const { data } = await httpClient.post<PaymentSource>('/payment-sources', payload)
  return data
}

export async function deletePaymentSource(id: number): Promise<void> {
  await httpClient.delete(`/payment-sources/${id}`)
}
