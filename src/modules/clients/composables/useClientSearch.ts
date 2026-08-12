import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { searchClients } from '../services/clientService'

export function useClientSearch(search: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['clients', 'search', search.value] as const),
    queryFn: () => searchClients(search.value),
  })
}
