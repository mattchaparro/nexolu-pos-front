import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { dismissWhatsappOnboarding, fetchDashboardSummary, fetchWhatsappOnboarding } from '../services/dashboardService'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  })
}

export function useWhatsappOnboarding() {
  return useQuery({
    queryKey: ['dashboard', 'whatsapp-onboarding'],
    queryFn: fetchWhatsappOnboarding,
  })
}

export function useDismissWhatsappOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dismissWhatsappOnboarding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'whatsapp-onboarding'] }),
  })
}
