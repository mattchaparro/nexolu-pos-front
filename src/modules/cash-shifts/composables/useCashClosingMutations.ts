import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { StoreCashClosingPayload } from '@/types/cashShift'

import { storeCashClosing, undoCashClosing } from '../services/cashShiftService'

export function useCashClosingMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-closings'] })
    queryClient.invalidateQueries({ queryKey: ['cash-shifts'] })
  }

  const storeMutation = useMutation({
    mutationFn: (payload: StoreCashClosingPayload) => storeCashClosing(payload),
    onSuccess: invalidate,
  })

  const undoMutation = useMutation({
    mutationFn: (id: number) => undoCashClosing(id),
    onSuccess: invalidate,
  })

  return { storeMutation, undoMutation }
}
