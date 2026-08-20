import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { closeMonth, type CloseMonthPayload } from '../services/accountingService'

export function useAccountingMutations() {
  const queryClient = useQueryClient()

  const closeMonthMutation = useMutation({
    mutationFn: (payload: CloseMonthPayload) => closeMonth(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['accounting-monthly', payload.year, payload.month] })
      queryClient.invalidateQueries({ queryKey: ['accounting-annual', payload.year] })
      queryClient.invalidateQueries({ queryKey: ['accounting-closings'] })
    },
  })

  return { closeMonthMutation }
}
