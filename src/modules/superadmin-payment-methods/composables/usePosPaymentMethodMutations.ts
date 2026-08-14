import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { PosPaymentMethodUpdatePayload } from '@/types/superadmin/posPaymentMethod'

import { createPosPaymentMethod, updatePosPaymentMethod } from '../services/posPaymentMethodService'

export function usePosPaymentMethodMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['superadmin', 'pos-payment-methods'] })

  const createMutation = useMutation({
    mutationFn: createPosPaymentMethod,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: PosPaymentMethodUpdatePayload }) => updatePosPaymentMethod(params.id, params.payload),
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation }
}
