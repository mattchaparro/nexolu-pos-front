import { useQuery } from '@tanstack/vue-query'

import { fetchActiveDiscounts } from '../services/salesService'

export function useActiveDiscounts() {
  return useQuery({
    queryKey: ['discounts', 'active'],
    queryFn: fetchActiveDiscounts,
  })
}
