import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { reverseSale } from '../services/salesService'

export function useSaleMutations() {
  const queryClient = useQueryClient()

  // Reversar restaura stock y borra la venta - invalida todo lo que puede
  // haber cambiado, mismo patron que useOpenTabMutations.
  const reverseMutation = useMutation({
    mutationFn: (saleId: number) => reverseSale(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] })
      queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] })
    },
  })

  return { reverseMutation }
}
