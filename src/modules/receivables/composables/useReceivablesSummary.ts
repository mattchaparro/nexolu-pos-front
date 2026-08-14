import { useQuery } from '@tanstack/vue-query'

import { fetchReceivablesSummary } from '../services/receivableService'

export function useReceivablesSummary() {
  return useQuery({
    queryKey: ['receivables', 'summary'],
    queryFn: fetchReceivablesSummary,
  })
}
