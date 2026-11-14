import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { Product } from '@/types/product'

import { updatePinnedProducts } from '../services/salesService'

const CATALOG_KEY = ['products', 'catalog']

/**
 * Fijar y ordenar los productos de Vender.
 *
 * Optimista: la grilla se reordena al instante en el cache del catalogo y, si
 * el servidor rechaza el cambio, vuelve a como estaba. Sin esto cada toque
 * esperaria una ida y vuelta, y en un mostrador con mala senal se siente roto.
 */
export function usePinnedProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productIds: number[]) => updatePinnedProducts(productIds),
    onMutate: async (productIds) => {
      await queryClient.cancelQueries({ queryKey: CATALOG_KEY })
      const previous = queryClient.getQueryData<Product[]>(CATALOG_KEY)
      const position = new Map(productIds.map((id, index) => [id, index]))

      queryClient.setQueryData<Product[]>(CATALOG_KEY, (products) =>
        products?.map((product) => ({ ...product, pinned_order: position.get(product.id) ?? null })),
      )

      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CATALOG_KEY, context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CATALOG_KEY }),
  })
}
