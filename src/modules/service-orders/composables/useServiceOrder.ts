import { useQuery } from '@tanstack/vue-query'
import { computed, type ComputedRef } from 'vue'

import { fetchServiceOrder } from '../services/serviceOrderService'

export function useServiceOrder(id: ComputedRef<number | null>) {
  return useQuery({
    queryKey: computed(() => ['service-orders', 'detail', id.value]),
    queryFn: () => fetchServiceOrder(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
