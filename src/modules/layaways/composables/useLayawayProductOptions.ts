import { useQuery } from '@tanstack/vue-query'

import { fetchProducts } from '@/modules/catalog/services/catalogService'

// Un apartado es "una venta que se paga por cuotas" - mismas reglas de
// items que Sale/OpenTab (ver ValidatesSaleItems en el backend), sin la
// exclusion de venta-unica/receta que si aplica a Compras. Por eso no se
// filtra is_service ni is_single_sale aca, a diferencia de
// usePurchasableProducts en el modulo de Compras.
export function useLayawayProductOptions() {
  return useQuery({
    queryKey: ['products', 'layaway-options'] as const,
    queryFn: async () => {
      const { data } = await fetchProducts({ per_page: 200 })
      return data
    },
  })
}
