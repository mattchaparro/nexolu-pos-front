import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchClients } from '../services/clientService'

export function useClients(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['clients', 'list', search.value, page.value] as const),
    queryFn: () => fetchClients({ search: search.value || undefined, page: page.value }),
    placeholderData: keepPreviousData,
  })
}
