import { useQuery } from '@tanstack/vue-query'
import { computed, type ComputedRef } from 'vue'

import { fetchLayaway } from '../services/layawayService'

export function useLayaway(id: ComputedRef<number | null>) {
  return useQuery({
    queryKey: computed(() => ['layaways', 'detail', id.value]),
    queryFn: () => fetchLayaway(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
