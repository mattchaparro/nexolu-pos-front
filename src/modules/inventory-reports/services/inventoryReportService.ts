import { httpClient } from '@/services/http/client'
import type { MarginsResponse, StockMovementsResponse } from '@/types/inventoryReport'

export interface MovementsFilters {
  type?: string
  reason_id?: number
  product_id?: number
  ingredient_id?: number
  from?: string
  to?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export async function fetchStockMovements(page: number, filters: MovementsFilters): Promise<StockMovementsResponse> {
  const { data } = await httpClient.get<StockMovementsResponse>('/reports/inventory/movements', { params: { page, ...filters } })
  return data
}

// responseType 'blob': mismo motivo que auditLogService.ts - el endpoint
// esta detras de auth:sanctum, asi que no se puede enlazar directo.
export async function fetchStockMovementsCsv(filters: MovementsFilters): Promise<Blob> {
  const { data } = await httpClient.get('/reports/inventory/movements/export', { params: filters, responseType: 'blob' })
  return data
}

export interface MarginsFilters {
  category_id?: number
  with_sales?: boolean
  month?: string
}

export async function fetchMargins(filters: MarginsFilters): Promise<MarginsResponse> {
  const { data } = await httpClient.get<MarginsResponse>('/reports/inventory/margins', { params: filters })
  return data
}

export async function fetchMarginsCsv(filters: MarginsFilters): Promise<Blob> {
  const { data } = await httpClient.get('/reports/inventory/margins/export', { params: filters, responseType: 'blob' })
  return data
}
