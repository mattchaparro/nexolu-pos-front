import { useQuery } from '@tanstack/vue-query'
import { computed, type ComputedRef } from 'vue'

import { fetchProduct } from '../services/catalogService'

export function useProduct(id: ComputedRef<number | null>) {
  return useQuery({
    queryKey: computed(() => ['products', 'admin', 'detail', id.value]),
    queryFn: () => fetchProduct(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
