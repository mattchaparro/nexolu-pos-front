import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchBusinesses } from '../services/businessService'

export function useBusinesses(search: Ref<string>, status: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'businesses', search.value, status.value, page.value] as const),
    queryFn: () => fetchBusinesses({ search: search.value || undefined, status: status.value || undefined, page: page.value }),
  })
}
