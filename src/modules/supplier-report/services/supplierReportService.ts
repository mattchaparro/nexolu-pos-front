import { httpClient } from '@/services/http/client'
import type { SupplierReportFilters, SupplierReportResponse } from '@/types/supplierReport'

function params(filters: SupplierReportFilters, page?: number) {
  return {
    from: filters.from || undefined,
    to: filters.to || undefined,
    supplier_id: filters.supplierId ?? undefined,
    page,
  }
}

export async function fetchSupplierReport(filters: SupplierReportFilters, page: number): Promise<SupplierReportResponse> {
  const { data } = await httpClient.get<SupplierReportResponse>('/reports/suppliers', { params: params(filters, page) })
  return data
}

// responseType 'blob': mismo motivo que salesBySellerService.ts - el endpoint
// esta detras de auth:sanctum, asi que no se puede enlazar directo.
export async function fetchSupplierReportCsv(filters: SupplierReportFilters): Promise<Blob> {
  const { data } = await httpClient.get('/reports/suppliers/export', { params: params(filters), responseType: 'blob' })
  return data
}
