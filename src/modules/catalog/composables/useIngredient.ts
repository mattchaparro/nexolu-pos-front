import { useQuery } from '@tanstack/vue-query'
import { computed, type ComputedRef } from 'vue'

import { fetchIngredient } from '../services/catalogService'

export function useIngredient(id: ComputedRef<number | null>) {
  return useQuery({
    queryKey: computed(() => ['ingredients', 'admin', 'detail', id.value]),
    queryFn: () => fetchIngredient(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
