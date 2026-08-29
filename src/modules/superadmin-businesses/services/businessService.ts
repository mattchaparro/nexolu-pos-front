import { httpClient } from '@/services/http/client'
import type { AuthResponse } from '@/types/auth'
import type { PaginatedResponse } from '@/types/pagination'
import type { SuperAdminBusiness, SuperAdminBusinessDetail } from '@/types/superadmin/business'

export interface FetchBusinessesParams {
  search?: string
  status?: string
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

/**
 * Alta completa (SuperAdmin\BusinessesController::store): datos del negocio y
 * del dueño, mas lo que se pacta en una llamada de ventas. A diferencia del
 * registro publico, los `feature_flags` de aca NO se clampan contra el plan -
 * el panel puede darle una funcion suelta a un negocio Básico.
 */
export interface CreateBusinessPayload {
  business_name: string
  owner_name: string
  email: string
  password: string
  phone?: string | null
  whatsapp_number?: string | null
  nit?: string | null
  address?: string | null
  plan: string
  feature_flags: Record<string, boolean>
  trial_days: number
  activate_days?: number | null
  amount_cop?: number | null
  custom_price_cop?: number | null
  notes?: string | null
  send_credentials: boolean
}

export async function createBusiness(payload: CreateBusinessPayload): Promise<SuperAdminBusiness> {
  const { data } = await httpClient.post<SuperAdminBusiness>('/superadmin/businesses', payload)
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
