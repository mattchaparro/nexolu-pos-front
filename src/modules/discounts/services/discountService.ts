import { httpClient } from '@/services/http/client'
import type { Discount, DiscountPayload } from '@/types/discount'
import type { PaginatedResponse } from '@/types/pagination'

export interface FetchDiscountsParams {
  search?: string
  page?: number
}

export async function fetchDiscounts(params: FetchDiscountsParams = {}): Promise<PaginatedResponse<Discount>> {
  const { data } = await httpClient.get<PaginatedResponse<Discount>>('/discounts', { params })
  return data
}

export async function createDiscount(payload: DiscountPayload): Promise<Discount> {
  const { data } = await httpClient.post<Discount>('/discounts', payload)
  return data
}

export async function updateDiscount(id: number, payload: Partial<DiscountPayload>): Promise<Discount> {
  const { data } = await httpClient.put<Discount>(`/discounts/${id}`, payload)
  return data
}

export async function deleteDiscount(id: number): Promise<void> {
  await httpClient.delete(`/discounts/${id}`)
}
