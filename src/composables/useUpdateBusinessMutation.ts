import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { updateBusiness } from '@/services/business'

export function useUpdateBusinessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBusiness,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business'] }),
  })
}
