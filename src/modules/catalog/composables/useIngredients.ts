import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchIngredients } from '../services/catalogService'

const INGREDIENTS_PER_PAGE = 20

// Sin busqueda (IngredientController::index no acepta parametro search, a
// diferencia de products) - solo pagina.
export function useIngredients(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['ingredients', 'admin', page.value] as const),
    queryFn: () => fetchIngredients({ page: page.value, per_page: INGREDIENTS_PER_PAGE }),
    placeholderData: keepPreviousData,
  })
}
