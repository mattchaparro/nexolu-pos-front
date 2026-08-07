import { useQuery } from '@tanstack/vue-query'

import { fetchOpenTabs } from '../services/openTabsService'

export function useOpenTabsList() {
  return useQuery({
    queryKey: ['open-tabs'],
    queryFn: fetchOpenTabs,
  })
}
