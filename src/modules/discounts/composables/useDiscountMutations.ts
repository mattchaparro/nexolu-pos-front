import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { DiscountPayload } from '@/types/discount'

import { createDiscount, deleteDiscount, updateDiscount } from '../services/discountService'

export function useDiscountMutations() {
  const queryClient = useQueryClient()
  // Invalida tambien ['discounts', 'active'] (useActiveDiscounts.ts, que
  // usa Vender para el selector de carrito/item) - un descuento creado,
  // editado o eliminado aca debe reflejarse ahi sin recargar la pagina.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['discounts'] })

  const createMutation = useMutation({
    mutationFn: createDiscount,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<DiscountPayload> }) =>
      updateDiscount(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDiscount,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
