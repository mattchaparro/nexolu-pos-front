import { httpClient } from '@/services/http/client'
import type {
  FinancingCredit,
  FinancingProvider,
  FinancingProviderPayload,
  FinancingSummary,
  RegisterPayoutPayload,
} from '@/types/financing'
import type { PaginatedResponse } from '@/types/pagination'

export async function fetchFinancingProviders(activeOnly = false): Promise<FinancingProvider[]> {
  const { data } = await httpClient.get<FinancingProvider[]>('/financing/providers', {
    params: activeOnly ? { active_only: 1 } : undefined,
  })
  return data
}

export async function createFinancingProvider(payload: FinancingProviderPayload): Promise<FinancingProvider> {
  const { data } = await httpClient.post<FinancingProvider>('/financing/providers', payload)
  return data
}

export async function updateFinancingProvider(id: number, payload: FinancingProviderPayload): Promise<FinancingProvider> {
  const { data } = await httpClient.put<FinancingProvider>(`/financing/providers/${id}`, payload)
  return data
}

export interface FetchFinancingCreditsParams {
  financing_provider_id?: number
  status?: 'pending' | 'paid' | 'overdue'
  search?: string
  page?: number
}

export async function fetchFinancingCredits(params: FetchFinancingCreditsParams): Promise<PaginatedResponse<FinancingCredit>> {
  const { data } = await httpClient.get<PaginatedResponse<FinancingCredit>>('/financing/credits', { params })
  return data
}

export async function fetchFinancingSummary(): Promise<FinancingSummary> {
  const { data } = await httpClient.get<FinancingSummary>('/financing/summary')
  return data
}

export async function registerFinancingPayout(id: number, payload: RegisterPayoutPayload): Promise<FinancingCredit> {
  const { data } = await httpClient.post<FinancingCredit>(`/financing/credits/${id}/payout`, payload)
  return data
}

export async function undoFinancingPayout(id: number): Promise<FinancingCredit> {
  const { data } = await httpClient.post<FinancingCredit>(`/financing/credits/${id}/undo-payout`)
  return data
}
