import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { httpClient } from '@/services/http/client'
import type { Product } from '@/types/product'

/**
 * Catalogo con el stock de UNA sede concreta, para armar un traslado.
 *
 * Pide la sede por header en vez de usar la activa del usuario: al armar un
 * traslado, la sede que importa es la de ORIGEN elegida en el formulario,
 * que casi nunca es en la que uno esta parado. Mandar 10 unidades desde un
 * local que solo tiene 3 es el error que hay que hacer imposible, y el
 * stock de la sede activa no ayuda a evitarlo.
 */
export function useBranchProducts(branchId: Ref<number | null>) {
  const query = useQuery({
    queryKey: computed(() => ['products', 'sellable', 'branch', branchId.value] as const),
    enabled: computed(() => branchId.value !== null),
    queryFn: async () => {
      const { data } = await httpClient.get<Product[]>('/products/sellable', {
        headers: { 'X-Branch-Id': String(branchId.value) },
      })
      return data
    },
  })

  return {
    query,
    products: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
  }
}
