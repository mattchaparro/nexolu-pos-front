import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type { RemindSupplierVisitPayload, Supplier, SupplierPayload } from '@/types/supplier'

export interface FetchSuppliersParams {
  search?: string
  page?: number
}

export async function fetchSuppliers(params: FetchSuppliersParams = {}): Promise<PaginatedResponse<Supplier>> {
  const { data } = await httpClient.get<PaginatedResponse<Supplier>>('/suppliers', { params })
  return data
}

export async function fetchSupplier(id: number): Promise<Supplier> {
  const { data } = await httpClient.get<Supplier>(`/suppliers/${id}`)
  return data
}

export async function createSupplier(payload: SupplierPayload): Promise<Supplier> {
  const { data } = await httpClient.post<Supplier>('/suppliers', payload)
  return data
}

export async function updateSupplier(id: number, payload: Partial<SupplierPayload>): Promise<Supplier> {
  const { data } = await httpClient.put<Supplier>(`/suppliers/${id}`, payload)
  return data
}

export async function deleteSupplier(id: number): Promise<void> {
  await httpClient.delete(`/suppliers/${id}`)
}

export async function remindSupplierVisit(id: number, payload: RemindSupplierVisitPayload): Promise<void> {
  await httpClient.post(`/suppliers/${id}/remind-visit`, payload)
}
