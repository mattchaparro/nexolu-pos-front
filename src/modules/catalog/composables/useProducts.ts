import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchProducts } from '../services/catalogService'

const PRODUCTS_PER_PAGE = 20

// queryKey reactivo (search/page como refs, no valores planos) - TanStack
// Query re-consulta solo cuando alguno cambia. `keepPreviousData` evita el
// parpadeo a "cargando" al pasar de pagina (se ve la pagina anterior hasta
// que llega la nueva).
export function useProducts(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['products', 'admin', search.value, page.value] as const),
    queryFn: () => fetchProducts({ search: search.value || undefined, page: page.value, per_page: PRODUCTS_PER_PAGE }),
    placeholderData: keepPreviousData,
  })
}
