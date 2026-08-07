import { useQuery } from '@tanstack/vue-query'

import { fetchDashboardSummary } from '../services/dashboardService'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  })
}
