import { useQuery } from '@tanstack/vue-query'

import { fetchProducts } from '@/modules/catalog/services/catalogService'

// Opciones para "aplica solo a este producto" en DiscountFormModal - mismo
// tope de 200 que usePurchasableProducts (usePurchaseFormOptions.ts), sin
// filtrar por comprable/servicio: un descuento de item puede atarse a
// cualquier producto vendible, incluido un servicio.
export function useDiscountProductOptions() {
  return useQuery({
    queryKey: ['products', 'discount-options'] as const,
    queryFn: async () => {
      const { data } = await fetchProducts({ per_page: 200 })
      return data
    },
  })
}
