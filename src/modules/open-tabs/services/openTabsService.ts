import { httpClient } from '@/services/http/client'
import type { Sale } from '@/types/sale'
import type { BusinessTable } from '@/types/table'

import type {
  CloseOpenTabPayload,
  OpenTabItemsPayload,
  OpenTabPayload,
  RecordPartialPaymentPayload,
} from '../types'

// Sin paginar (BusinessTableController/OpenTabController::index no paginan)
// - igual que product-categories, llega como array plano por
// JsonResource::withoutWrapping() global (ver salesService.ts).
export async function fetchTables(): Promise<BusinessTable[]> {
  const { data } = await httpClient.get<BusinessTable[]>('/tables')
  return data
}

export async function fetchOpenTabs(): Promise<Sale[]> {
  const { data } = await httpClient.get<Sale[]>('/open-tabs')
  return data
}

export async function fetchOpenTab(id: number): Promise<Sale> {
  const { data } = await httpClient.get<Sale>(`/open-tabs/${id}`)
  return data
}

export async function createTable(payload: {
  name: string
  number?: number
}): Promise<BusinessTable> {
  const { data } = await httpClient.post<BusinessTable>('/tables', payload)
  return data
}

export async function updateTable(
  id: number,
  payload: { name?: string; number?: number; is_active?: boolean },
): Promise<BusinessTable> {
  const { data } = await httpClient.put<BusinessTable>(`/tables/${id}`, payload)
  return data
}

export async function deleteTable(id: number): Promise<void> {
  await httpClient.delete(`/tables/${id}`)
}

export async function openTab(payload: OpenTabPayload): Promise<Sale> {
  const { data } = await httpClient.post<Sale>('/open-tabs', payload)
  return data
}

export async function addOpenTabItems(saleId: number, payload: OpenTabItemsPayload): Promise<Sale> {
  const { data } = await httpClient.post<Sale>(`/open-tabs/${saleId}/items`, payload)
  return data
}

export async function syncOpenTabItems(saleId: number, payload: OpenTabItemsPayload): Promise<Sale> {
  const { data } = await httpClient.put<Sale>(`/open-tabs/${saleId}/items`, payload)
  return data
}

export async function recordPartialPayment(
  saleId: number,
  payload: RecordPartialPaymentPayload,
): Promise<Sale> {
  const { data } = await httpClient.post<Sale>(`/open-tabs/${saleId}/partial-payments`, payload)
  return data
}

export async function closeOpenTab(saleId: number, payload: CloseOpenTabPayload): Promise<Sale> {
  const { data } = await httpClient.post<Sale>(`/open-tabs/${saleId}/close`, payload)
  return data
}

export async function deleteOpenTab(saleId: number): Promise<void> {
  await httpClient.delete(`/open-tabs/${saleId}`)
}
