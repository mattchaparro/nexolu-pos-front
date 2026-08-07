import { httpClient } from '@/services/http/client'
import type { Business } from '@/types/business'

export async function fetchBusiness(): Promise<Business> {
  const { data } = await httpClient.get<Business>('/business')
  return data
}
