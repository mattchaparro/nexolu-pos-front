import { useQuery } from '@tanstack/vue-query'

import { fetchFeatureCatalog } from '../services/featureCatalogService'

export function useFeatureCatalog() {
  return useQuery({
    queryKey: ['superadmin', 'feature-catalog'],
    queryFn: fetchFeatureCatalog,
  })
}
