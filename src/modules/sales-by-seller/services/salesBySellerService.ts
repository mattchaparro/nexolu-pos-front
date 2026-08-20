import { httpClient } from '@/services/http/client'
import type { SalesBySellerResponse } from '@/types/salesBySeller'

export async function fetchSalesBySeller(from: string, to: string): Promise<SalesBySellerResponse> {
  const { data } = await httpClient.get<SalesBySellerResponse>('/reports/sales/by-seller', { params: { from, to } })
  return data
}

// responseType 'blob': mismo motivo que auditLogService.ts - el endpoint
// esta detras de auth:sanctum, asi que no se puede enlazar directo.
export async function fetchSalesBySellerCsv(from: string, to: string): Promise<Blob> {
  const { data } = await httpClient.get('/reports/sales/by-seller/export', { params: { from, to }, responseType: 'blob' })
  return data
}
