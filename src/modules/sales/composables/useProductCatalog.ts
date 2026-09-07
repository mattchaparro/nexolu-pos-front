import { useQuery } from '@tanstack/vue-query'

import { fetchFrequentProductIds, fetchProductCategories, fetchSellableProducts } from '../services/salesService'

export function useProductCatalog() {
  const productsQuery = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: fetchSellableProducts,
  })

  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: fetchProductCategories,
  })

  // "Frecuentes": lo que mas rota en los ultimos 30 dias. Cambia despacio
  // (una venta mas no reordena la lista), asi que se cachea generoso en vez
  // de recalcularlo en cada entrada a Vender - es un atajo, no un reporte.
  const frequentQuery = useQuery({
    queryKey: ['products', 'frequent'],
    queryFn: fetchFrequentProductIds,
    staleTime: 30 * 60_000,
  })

  return { productsQuery, categoriesQuery, frequentQuery }
}
