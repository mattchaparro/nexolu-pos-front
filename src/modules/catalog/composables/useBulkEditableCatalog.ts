import { useQuery } from '@tanstack/vue-query'
import type { ComputedRef } from 'vue'

import { fetchIngredientOptions, fetchProducts } from '../services/catalogService'

// Fuente de datos de la pantalla de edicion masiva: igual que
// fetchIngredientOptions (recipe picker), trae "casi todo" en una sola
// pagina en vez de paginar - el backend limita per_page a 200
// (ProductController::index), mismo techo ya aceptado para el picker de
// insumos. Solo productos activos que no sean servicio (un servicio no
// tiene stock/costo que ajustar) - igual que Admin\StockController::bulk()
// del legacy.
export function useBulkEditableProducts(enabled: ComputedRef<boolean>) {
  return useQuery({
    queryKey: ['products', 'admin', 'bulk-edit'] as const,
    queryFn: async () => {
      const { data } = await fetchProducts({ per_page: 200 })
      return data.filter((p) => p.is_active && !p.is_service)
    },
    enabled,
  })
}

export function useBulkEditableIngredients(enabled: ComputedRef<boolean>) {
  return useQuery({
    queryKey: ['ingredients', 'options', 'bulk-edit'] as const,
    queryFn: async () => {
      const ingredients = await fetchIngredientOptions()
      return ingredients.filter((i) => i.is_active)
    },
    enabled,
  })
}
