import { httpClient } from '@/services/http/client'
import type {
  AddLayawayPaymentPayload,
  Layaway,
  LayawayItemInput,
  LayawayPayload,
  LayawayStatus,
} from '@/types/layaway'
import type { PaginatedResponse } from '@/types/pagination'

export interface FetchLayawaysParams {
  status?: LayawayStatus | ''
  search?: string
  page?: number
}

export async function fetchLayaways(params: FetchLayawaysParams = {}): Promise<PaginatedResponse<Layaway>> {
  const { data } = await httpClient.get<PaginatedResponse<Layaway>>('/layaways', { params })
  return data
}

export async function fetchLayaway(id: number): Promise<Layaway> {
  const { data } = await httpClient.get<Layaway>(`/layaways/${id}`)
  return data
}

export async function createLayaway(payload: LayawayPayload): Promise<Layaway> {
  const { data } = await httpClient.post<Layaway>('/layaways', payload)
  return data
}

export async function addLayawayPayment(id: number, payload: AddLayawayPaymentPayload): Promise<Layaway> {
  const { data } = await httpClient.post<Layaway>(`/layaways/${id}/payments`, payload)
  return data
}

export async function updateLayawayItems(id: number, items: LayawayItemInput[]): Promise<Layaway> {
  const { data } = await httpClient.put<Layaway>(`/layaways/${id}/items`, { items })
  return data
}

export async function completeLayaway(id: number): Promise<Layaway> {
  const { data } = await httpClient.post<Layaway>(`/layaways/${id}/complete`)
  return data
}

export async function cancelLayaway(id: number): Promise<void> {
  await httpClient.post(`/layaways/${id}/cancel`)
}
