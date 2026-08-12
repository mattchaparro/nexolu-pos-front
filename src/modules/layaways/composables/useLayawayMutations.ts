import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { AddLayawayPaymentPayload, LayawayItemInput } from '@/types/layaway'

import {
  addLayawayPayment,
  cancelLayaway,
  completeLayaway,
  createLayaway,
  updateLayawayItems,
} from '../services/layawayService'

export function useLayawayMutations() {
  const queryClient = useQueryClient()

  // Un apartado mueve stock (reserva al crear, ajusta al editar items,
  // libera al cancelar) - invalida productos igual que Purchases/Sales.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['layaways'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const createMutation = useMutation({
    mutationFn: createLayaway,
    onSuccess: invalidate,
  })

  const payMutation = useMutation({
    mutationFn: (params: { id: number; payload: AddLayawayPaymentPayload }) => addLayawayPayment(params.id, params.payload),
    onSuccess: invalidate,
  })

  const updateItemsMutation = useMutation({
    mutationFn: (params: { id: number; items: LayawayItemInput[] }) => updateLayawayItems(params.id, params.items),
    onSuccess: invalidate,
  })

  const completeMutation = useMutation({
    mutationFn: completeLayaway,
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelLayaway,
    onSuccess: invalidate,
  })

  return { createMutation, payMutation, updateItemsMutation, completeMutation, cancelMutation }
}
