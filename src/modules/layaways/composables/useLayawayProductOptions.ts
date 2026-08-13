import { useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { fetchProducts } from '@/modules/catalog/services/catalogService'

// Un apartado es "una venta que se paga por cuotas" - sin la exclusion de
// venta-unica/receta que si aplica a Compras, por eso no se filtra
// is_single_sale aca a diferencia de usePurchasableProducts en el modulo de
// Compras. is_service SI se filtra (for_layaway en el backend): legacy
// (LayawaysController::create()/show()) excluye servicios, inactivos y sin
// stock, y respeta layaway_allowed_category_ids si el negocio restringe a
// ciertas categorias - ver ProductController::index().
//
// includeProductIds: productos que ya estan en el apartado que se esta
// editando - se agregan de vuelta aunque no cumplan el filtro (p.ej. se
// agotaron despues de apartarlos), igual que el whereIn($currentProductIds)
// que legacy hace en show(), para que no desaparezcan del selector.
export function useLayawayProductOptions(includeProductIds: MaybeRefOrGetter<number[]> = []) {
  return useQuery({
    queryKey: computed(() => ['products', 'layaway-options', toValue(includeProductIds)] as const),
    queryFn: async () => {
      const { data } = await fetchProducts({ per_page: 200, for_layaway: true, include_ids: toValue(includeProductIds) })
      return data
    },
  })
}
