import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { searchBusinesses } from '../services/communicationService'

export function useBusinessSearch(search: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'businesses', 'search', search.value] as const),
    queryFn: () => searchBusinesses(search.value),
    enabled: computed(() => search.value.trim().length > 0),
  })
}
