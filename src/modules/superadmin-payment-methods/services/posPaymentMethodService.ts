import { httpClient } from '@/services/http/client'
import type {
  PosPaymentMethodCreatePayload,
  PosPaymentMethodUpdatePayload,
  SuperAdminPosPaymentMethod,
} from '@/types/superadmin/posPaymentMethod'

export async function fetchPosPaymentMethods(): Promise<SuperAdminPosPaymentMethod[]> {
  const { data } = await httpClient.get<SuperAdminPosPaymentMethod[]>('/superadmin/pos-payment-methods')
  return data
}

export async function createPosPaymentMethod(payload: PosPaymentMethodCreatePayload): Promise<SuperAdminPosPaymentMethod> {
  const { data } = await httpClient.post<SuperAdminPosPaymentMethod>('/superadmin/pos-payment-methods', payload)
  return data
}

export async function updatePosPaymentMethod(
  id: number,
  payload: PosPaymentMethodUpdatePayload,
): Promise<SuperAdminPosPaymentMethod> {
  const { data } = await httpClient.put<SuperAdminPosPaymentMethod>(`/superadmin/pos-payment-methods/${id}`, payload)
  return data
}
