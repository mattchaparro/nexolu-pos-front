import { httpClient } from '@/services/http/client'
import type { BillingProfile, UpdateBillingProfilePayload } from '@/types/billing'

export async function fetchBillingProfile(): Promise<BillingProfile> {
  const { data } = await httpClient.get<BillingProfile>('/business/billing-profile')
  return data
}

export async function updateBillingProfile(payload: UpdateBillingProfilePayload): Promise<BillingProfile> {
  const { data } = await httpClient.put<BillingProfile>('/business/billing-profile', payload)
  return data
}
