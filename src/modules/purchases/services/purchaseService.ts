import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type { PayPurchasePayload, Purchase, PurchasePayload, PurchasePaymentStatus } from '@/types/purchase'

export interface FetchPurchasesParams {
  from?: string
  to?: string
  payment_status?: PurchasePaymentStatus
  page?: number
}

export async function fetchPurchases(params: FetchPurchasesParams = {}): Promise<PaginatedResponse<Purchase>> {
  const { data } = await httpClient.get<PaginatedResponse<Purchase>>('/purchases', { params })
  return data
}

export async function fetchPurchase(id: number): Promise<Purchase> {
  const { data } = await httpClient.get<Purchase>(`/purchases/${id}`)
  return data
}

export async function createPurchase(payload: PurchasePayload): Promise<Purchase> {
  const { data } = await httpClient.post<Purchase>('/purchases', payload)
  return data
}

export async function payPurchase(id: number, payload: PayPurchasePayload): Promise<Purchase> {
  const { data } = await httpClient.post<Purchase>(`/purchases/${id}/pay`, payload)
  return data
}
