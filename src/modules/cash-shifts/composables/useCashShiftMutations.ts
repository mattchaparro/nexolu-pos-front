import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { CloseCashShiftPayload, OpenCashShiftPayload } from '@/types/cashShift'

import { closeCashShift, openCashShift } from '../services/cashShiftService'

export function useCashShiftMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-shifts'] })
    queryClient.invalidateQueries({ queryKey: ['cash-closings'] })
  }

  const openMutation = useMutation({
    mutationFn: (payload: OpenCashShiftPayload) => openCashShift(payload),
    onSuccess: invalidate,
  })

  const closeMutation = useMutation({
    mutationFn: (params: { id: number; payload: CloseCashShiftPayload }) => closeCashShift(params.id, params.payload),
    onSuccess: invalidate,
  })

  return { openMutation, closeMutation }
}
