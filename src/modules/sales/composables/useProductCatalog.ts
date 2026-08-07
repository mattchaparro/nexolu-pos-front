import { useQuery } from '@tanstack/vue-query'

import { fetchProductCategories, fetchSellableProducts } from '../services/salesService'

export function useProductCatalog() {
  const productsQuery = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: fetchSellableProducts,
  })

  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: fetchProductCategories,
  })

  return { productsQuery, categoriesQuery }
}
