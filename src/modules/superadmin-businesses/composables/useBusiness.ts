import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchBusiness } from '../services/businessService'

export function useBusiness(id: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'businesses', id.value] as const),
    queryFn: () => fetchBusiness(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
