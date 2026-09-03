import { httpClient } from '@/services/http/client'
import type { SuperAdminDashboardResponse } from '@/types/superAdminDashboard'

export async function fetchSuperAdminDashboard(): Promise<SuperAdminDashboardResponse> {
  const { data } = await httpClient.get<SuperAdminDashboardResponse>('/superadmin/dashboard')
  return data
}
