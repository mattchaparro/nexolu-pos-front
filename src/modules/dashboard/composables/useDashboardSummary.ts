import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import type { DashboardSummary } from '@/types/dashboard'

import {
  dismissWhatsappOnboarding,
  fetchDashboardSummary,
  fetchWhatsappOnboarding,
  updateDashboardShortcuts,
} from '../services/dashboardService'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  })
}

export function useUpdateDashboardShortcuts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDashboardShortcuts,
    // setQueryData en vez de invalidateQueries + refetch: la respuesta ya
    // trae los shortcuts guardados, no hace falta un GET /dashboard/summary
    // completo de nuevo solo para reflejar el cambio.
    onSuccess: (shortcuts) => {
      queryClient.setQueryData<DashboardSummary>(['dashboard', 'summary'], (current) =>
        current ? { ...current, shortcuts } : current,
      )
    },
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
