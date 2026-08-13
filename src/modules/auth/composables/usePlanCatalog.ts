import { useQuery } from '@tanstack/vue-query'

import { fetchPlanCatalog } from '../services/planCatalogService'

export function usePlanCatalog() {
  return useQuery({
    queryKey: ['plans', 'catalog'],
    queryFn: fetchPlanCatalog,
  })
}
