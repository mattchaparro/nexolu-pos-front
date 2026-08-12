import { httpClient } from '@/services/http/client'
import type { AuthResponse } from '@/types/auth'
import type { PaginatedResponse } from '@/types/pagination'
import type { SuperAdminBusiness, SuperAdminBusinessDetail } from '@/types/superadmin/business'

export interface FetchBusinessesParams {
  search?: string
  page?: number
}

export async function fetchBusinesses(params: FetchBusinessesParams = {}): Promise<PaginatedResponse<SuperAdminBusiness>> {
  const { data } = await httpClient.get<PaginatedResponse<SuperAdminBusiness>>('/superadmin/businesses', { params })
  return data
}

export async function fetchBusiness(id: number): Promise<SuperAdminBusinessDetail> {
  const { data } = await httpClient.get<SuperAdminBusinessDetail>(`/superadmin/businesses/${id}`)
  return data
}

export async function impersonateUser(userId: number): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>(`/superadmin/impersonate/${userId}`)
  return data
}
