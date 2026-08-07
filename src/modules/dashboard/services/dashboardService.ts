import { httpClient } from '@/services/http/client'
import type { DashboardSummary } from '@/types/dashboard'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await httpClient.get<DashboardSummary>('/dashboard/summary')
  return data
}
