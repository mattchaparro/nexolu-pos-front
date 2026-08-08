import { useQuery } from '@tanstack/vue-query'

import { fetchCategories } from '../services/catalogService'

export function useCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: fetchCategories,
  })
}
