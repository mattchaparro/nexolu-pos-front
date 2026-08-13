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

export interface UpdateBusinessConfigPayload {
  subscription_plan: string
  feature_flags: Record<string, boolean>
}

export async function updateBusinessConfig(id: number, payload: UpdateBusinessConfigPayload): Promise<SuperAdminBusiness> {
  const { data } = await httpClient.patch<SuperAdminBusiness>(`/superadmin/businesses/${id}/config`, payload)
  return data
}

export interface ActivateBusinessPayload {
  days: number
  amount_cop?: number | null
  plan?: string | null
  notes?: string | null
}

export async function activateBusiness(id: number, payload: ActivateBusinessPayload): Promise<void> {
  await httpClient.post(`/superadmin/businesses/${id}/activate`, payload)
}

export async function extendBusinessTrial(id: number, days: number): Promise<SuperAdminBusiness> {
  const { data } = await httpClient.patch<SuperAdminBusiness>(`/superadmin/businesses/${id}/extend-trial`, { days })
  return data
}

export async function setBusinessCustomPrice(id: number, customPriceCop: number | null): Promise<SuperAdminBusiness> {
  const { data } = await httpClient.patch<SuperAdminBusiness>(`/superadmin/businesses/${id}/custom-price`, {
    custom_price_cop: customPriceCop,
  })
  return data
}

export async function changeBusinessPlan(id: number, plan: string): Promise<SuperAdminBusiness> {
  const { data } = await httpClient.patch<SuperAdminBusiness>(`/superadmin/businesses/${id}/plan`, { plan })
  return data
}
