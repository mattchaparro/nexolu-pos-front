import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { createStockTransfer } from '../services/stockTransferService'

export function useStockTransferMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createStockTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      // Un traslado mueve stock en DOS sedes: el catalogo y los reportes de
      // inventario que esten cacheados quedan viejos en ambas.
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  return { createMutation }
}
