import { useQuery } from '@tanstack/vue-query'

import { fetchTables } from '../services/openTabsService'

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
  })
}
