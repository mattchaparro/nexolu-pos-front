import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchBusinesses } from '../services/businessService'

export function useBusinesses(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'businesses', search.value, page.value] as const),
    queryFn: () => fetchBusinesses({ search: search.value || undefined, page: page.value }),
  })
}
