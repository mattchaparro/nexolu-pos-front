import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { clearLowStockSnooze } from '@/services/business'

export function useClearLowStockSnoozeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clearLowStockSnooze,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business'] }),
  })
}
