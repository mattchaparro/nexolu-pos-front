import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type {
  PayServiceOrderPayload,
  ServiceOrder,
  ServiceOrderPayload,
  ServiceOrderStatus,
} from '@/types/serviceOrder'

export interface FetchServiceOrdersParams {
  status?: ServiceOrderStatus | ''
  search?: string
  stage_id?: number
  page?: number
}

export async function fetchServiceOrders(params: FetchServiceOrdersParams = {}): Promise<PaginatedResponse<ServiceOrder>> {
  const { data } = await httpClient.get<PaginatedResponse<ServiceOrder>>('/service-orders', { params })
  return data
}

export interface ServiceOrdersSummary {
  pending_balance: number
}

export async function fetchServiceOrdersSummary(): Promise<ServiceOrdersSummary> {
  const { data } = await httpClient.get<ServiceOrdersSummary>('/service-orders/summary')
  return data
}

export async function fetchServiceOrder(id: number): Promise<ServiceOrder> {
  const { data } = await httpClient.get<ServiceOrder>(`/service-orders/${id}`)
  return data
}

export async function createServiceOrder(payload: ServiceOrderPayload): Promise<ServiceOrder> {
  const { data } = await httpClient.post<ServiceOrder>('/service-orders', payload)
  return data
}

export async function updateServiceOrder(id: number, payload: ServiceOrderPayload): Promise<ServiceOrder> {
  const { data } = await httpClient.put<ServiceOrder>(`/service-orders/${id}`, payload)
  return data
}

export async function payServiceOrder(id: number, payload: PayServiceOrderPayload): Promise<ServiceOrder> {
  const { data } = await httpClient.post<ServiceOrder>(`/service-orders/${id}/pay`, payload)
  return data
}

export async function cancelServiceOrder(id: number): Promise<void> {
  await httpClient.post(`/service-orders/${id}/cancel`)
}

export async function deleteServiceOrder(id: number): Promise<void> {
  await httpClient.delete(`/service-orders/${id}`)
}

export async function setServiceOrderStage(id: number, stageId: number): Promise<ServiceOrder> {
  const { data } = await httpClient.patch<ServiceOrder>(`/service-orders/${id}/stage`, { stage_id: stageId })
  return data
}
