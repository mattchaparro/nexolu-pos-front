import { useQuery } from '@tanstack/vue-query'
import { computed, type ComputedRef } from 'vue'

import { fetchSupplier } from '../services/supplierService'

export function useSupplier(id: ComputedRef<number | null>) {
  return useQuery({
    queryKey: computed(() => ['suppliers', 'detail', id.value]),
    queryFn: () => fetchSupplier(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
