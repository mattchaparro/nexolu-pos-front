import { httpClient } from '@/services/http/client'
import type { SalesHistoryResponse } from '@/types/salesHistory'

export interface SalesHistoryFilters {
  status?: string
  payment_method?: string
  search?: string
}

export async function fetchSalesHistory(
  from: string,
  to: string,
  page: number,
  perPage: number,
  filters: SalesHistoryFilters,
): Promise<SalesHistoryResponse> {
  const { data } = await httpClient.get<SalesHistoryResponse>('/reports/sales/history', {
    params: { from, to, page, per_page: perPage, ...filters },
  })
  return data
}

// responseType 'blob': mismo motivo que auditLogService.ts - el endpoint
// esta detras de auth:sanctum, asi que no se puede enlazar directo.
export async function fetchSalesHistoryCsv(from: string, to: string, filters: SalesHistoryFilters): Promise<Blob> {
  const { data } = await httpClient.get('/reports/sales/history/export', {
    params: { from, to, ...filters },
    responseType: 'blob',
  })
  return data
}
