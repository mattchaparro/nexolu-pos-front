import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { PayPurchasePayload } from '@/types/purchase'

import { createPurchase, payPurchase } from '../services/purchaseService'

export function usePurchaseMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      // Una compra mueve stock y recalcula costo promedio de productos e
      // insumos - igual que StockMovement, invalida todo lo que dependa de
      // eso (listas, resumenes del Catalogo).
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })

  const payMutation = useMutation({
    mutationFn: (params: { id: number; payload: PayPurchasePayload }) => payPurchase(params.id, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
    },
  })

  return { createMutation, payMutation }
}
