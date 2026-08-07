import { useQuery } from '@tanstack/vue-query'

import { fetchBusiness } from '@/services/business'

export function useBusiness() {
  return useQuery({
    queryKey: ['business'],
    queryFn: fetchBusiness,
  })
}
