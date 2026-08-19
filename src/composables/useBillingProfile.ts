import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { fetchBillingProfile, updateBillingProfile } from '@/services/billingProfile'

export function useBillingProfile() {
  return useQuery({ queryKey: ['billing-profile'], queryFn: fetchBillingProfile })
}

export function useUpdateBillingProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateBillingProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['billing-profile'], data)
    },
  })
}
