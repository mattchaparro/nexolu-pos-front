import { httpClient } from '@/services/http/client'
import type { PaymentMethodsCatalog, PseFinancialInstitution } from '@/types/paymentSource'

export async function fetchPaymentMethods(): Promise<PaymentMethodsCatalog> {
  const { data } = await httpClient.get<PaymentMethodsCatalog>('/payment-methods')
  return data
}

export async function fetchPseFinancialInstitutions(): Promise<PseFinancialInstitution[]> {
  const { data } = await httpClient.get<{ financial_institutions: PseFinancialInstitution[] }>('/pse/financial-institutions')
  return data.financial_institutions
}
