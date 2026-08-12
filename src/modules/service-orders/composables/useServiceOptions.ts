import { useQuery } from '@tanstack/vue-query'

import { fetchProducts } from '@/modules/catalog/services/catalogService'

// Catalogo de servicios (is_service=true) para autocompletar nombre/precio
// al armar una orden - mismo query que la pestaña Servicios del Catalogo
// (ver modules/catalog/composables/useProducts.ts:useServices), sin
// paginar: el picker necesita el listado casi completo de una vez.
export function useServiceOptions() {
  return useQuery({
    queryKey: ['products', 'service-order-options'] as const,
    queryFn: async () => {
      const { data } = await fetchProducts({ per_page: 200, is_service: true })
      return data
    },
  })
}
