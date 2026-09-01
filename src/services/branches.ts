import { httpClient } from '@/services/http/client'
import type { Branch, BranchComparison, BranchesResponse, BranchPayload } from '@/types/branch'

// Compartido entre modulos (el selector de la barra superior, Ajustes,
// traslados y el comparativo lo usan), asi que vive fuera de un modulo
// puntual - ver README.md "Modulos independientes".
export async function fetchBranches(includeInactive = false): Promise<BranchesResponse> {
  const { data } = await httpClient.get<BranchesResponse>('/branches', {
    // Solo la pantalla de administracion lo pide: el selector no puede
    // ofrecer una sede cerrada, pero reactivarla exige poder verla.
    params: includeInactive ? { include_inactive: 1 } : undefined,
  })
  return data
}

export async function createBranch(payload: BranchPayload): Promise<Branch> {
  const { data } = await httpClient.post<Branch>('/branches', payload)
  return data
}

export async function updateBranch(id: number, payload: BranchPayload): Promise<Branch> {
  const { data } = await httpClient.put<Branch>(`/branches/${id}`, payload)
  return data
}

export async function deactivateBranch(id: number): Promise<Branch> {
  const { data } = await httpClient.post<Branch>(`/branches/${id}/deactivate`)
  return data
}

export async function fetchBranchComparison(params: {
  from?: string
  to?: string
}): Promise<BranchComparison> {
  const { data } = await httpClient.get<BranchComparison>('/reports/branches', { params })
  return data
}

/** Precios por sede de un producto. Ausencia de fila = precio del catalogo. */
export interface BranchPriceRow {
  branch_id: number
  product_variant_id: number | null
  price: number
}

export interface BranchPricesResponse {
  product_id: number
  base_price: number
  branch_prices: BranchPriceRow[]
}

export async function fetchBranchPrices(productId: number): Promise<BranchPricesResponse> {
  const { data } = await httpClient.get<BranchPricesResponse>(`/products/${productId}/branch-prices`)
  return data
}

export async function updateBranchPrices(
  productId: number,
  prices: Array<{ branch_id: number; product_variant_id?: number | null; price: number | null }>,
): Promise<BranchPricesResponse> {
  const { data } = await httpClient.put<BranchPricesResponse>(
    `/products/${productId}/branch-prices`,
    { prices },
  )
  return data
}
