import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { PayServiceOrderPayload, ServiceOrderPayload } from '@/types/serviceOrder'

import { cancelServiceOrder, createServiceOrder, payServiceOrder, updateServiceOrder } from '../services/serviceOrderService'

export function useServiceOrderMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service-orders'] })
  }

  const createMutation = useMutation({
    mutationFn: createServiceOrder,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: ServiceOrderPayload }) => updateServiceOrder(params.id, params.payload),
    onSuccess: invalidate,
  })

  const payMutation = useMutation({
    mutationFn: (params: { id: number; payload: PayServiceOrderPayload }) => payServiceOrder(params.id, params.payload),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelServiceOrder,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, payMutation, cancelMutation }
}
