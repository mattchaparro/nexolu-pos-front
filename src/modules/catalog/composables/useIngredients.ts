import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchIngredients } from '../services/catalogService'

const INGREDIENTS_PER_PAGE = 20

// enabled: la feature "ingredients" puede estar apagada para el negocio -
// sin esto la query se disparaba igual al montar Catalogo (aunque la
// pestaña Ingredientes ni se renderice), y GET /ingredients devuelve 403
// para esos negocios (ver EnsureBusinessFeatureEnabled) - el interceptor
// de axios ahora SI muestra ese 403 como toast (ver client.ts), asi que
// dispararla sin necesidad ya no es inofensivo como antes.
export function useIngredients(search: Ref<string>, page: Ref<number>, enabled: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => ['ingredients', 'admin', search.value, page.value] as const),
    queryFn: () => fetchIngredients({ search: search.value || undefined, page: page.value, per_page: INGREDIENTS_PER_PAGE }),
    placeholderData: keepPreviousData,
    enabled,
  })
}
