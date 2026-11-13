import { httpClient } from '@/services/http/client'
import type { KitchenTicket, UpdateKitchenStatusPayload } from '@/types/kitchenTicket'

// Sin paginacion ni wrapper "data" - GET /kitchen/tickets devuelve el array
// completo de comandas abiertas (ver KitchenBoardService::openTickets()).
export async function fetchKitchenTickets(): Promise<KitchenTicket[]> {
  const { data } = await httpClient.get<KitchenTicket[]>('/kitchen/tickets')
  return data
}

/** Pedido online listo que sale del local: enviado o entregado. */
export async function dispatchOnlineOrder(saleId: number): Promise<KitchenTicket> {
  const { data } = await httpClient.post<KitchenTicket>(`/kitchen/tickets/${saleId}/dispatch`)
  return data
}

export async function updateKitchenStatus(saleId: number, payload: UpdateKitchenStatusPayload): Promise<KitchenTicket> {
  const { data } = await httpClient.post<KitchenTicket>(`/kitchen/tickets/${saleId}/status`, payload)
  return data
}
