import { httpClient } from '@/services/http/client'
import type { Order, OrderStatus } from '@/types/order'
import type { PaginatedResponse } from '@/types/pagination'

export async function fetchOrders(params: {
  status?: string
  page?: number
  search?: string
}): Promise<PaginatedResponse<Order>> {
  const { data } = await httpClient.get<PaginatedResponse<Order>>('/orders', { params })
  return data
}

// Sin envoltorio `data`: la app desactiva el wrapping de JsonResource (ver
// AppServiceProvider). Solo las colecciones paginadas traen data/meta.
export async function fetchOrder(id: number): Promise<Order> {
  const { data } = await httpClient.get<Order>(`/orders/${id}`)
  return data
}

export async function updateOrderStatus(
  id: number,
  status: OrderStatus,
  note?: string,
  paymentMethod?: string,
): Promise<Order> {
  const { data } = await httpClient.patch<Order>(`/orders/${id}/status`, {
    status,
    note,
    payment_method: paymentMethod,
  })
  return data
}

export async function fetchPendingOrderCount(): Promise<number> {
  const { data } = await httpClient.get<{ pending: number }>('/orders/pending-count')
  return data.pending
}
