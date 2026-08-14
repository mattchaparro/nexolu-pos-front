import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type { CollectReceivablePayload, Receivable, ReceivableStatus, ReceivableSummary } from '@/types/receivable'

export interface FetchReceivablesParams {
  status?: ReceivableStatus
  search?: string
  date_from?: string
  date_to?: string
  page?: number
}

export async function fetchReceivables(params: FetchReceivablesParams = {}): Promise<PaginatedResponse<Receivable>> {
  const { data } = await httpClient.get<PaginatedResponse<Receivable>>('/receivables', { params })
  return data
}

export async function fetchReceivablesSummary(): Promise<ReceivableSummary> {
  const { data } = await httpClient.get<ReceivableSummary>('/receivables/summary')
  return data
}

export async function collectReceivable(id: number, payload: CollectReceivablePayload): Promise<Receivable> {
  const { data } = await httpClient.post<Receivable>(`/receivables/${id}/collect`, payload)
  return data
}
