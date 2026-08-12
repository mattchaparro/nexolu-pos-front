import { useQuery } from '@tanstack/vue-query'
import { computed, type ComputedRef } from 'vue'

import { fetchPurchase } from '../services/purchaseService'

export function usePurchase(id: ComputedRef<number | null>) {
  return useQuery({
    queryKey: computed(() => ['purchases', 'detail', id.value]),
    queryFn: () => fetchPurchase(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
