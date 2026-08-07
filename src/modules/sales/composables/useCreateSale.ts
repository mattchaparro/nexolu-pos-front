import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { createSale } from '../services/salesService'

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      // Una venta cambia el stock (catalogo) y el resumen del dia
      // (Dashboard) - se invalidan en vez de refetch manual puntual, el
      // proximo componente que los use ya pide datos frescos.
      queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    },
  })
}
