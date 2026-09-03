import { useQuery } from '@tanstack/vue-query'

import { fetchSuperAdminDashboard } from '../services/dashboardService'

export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: ['superadmin', 'dashboard'],
    queryFn: fetchSuperAdminDashboard,
  })
}
