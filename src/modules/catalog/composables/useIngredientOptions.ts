import { useQuery } from '@tanstack/vue-query'
import { type ComputedRef } from 'vue'

import { fetchIngredientOptions } from '../services/catalogService'

// /ingredients esta detras de middleware('feature:ingredients') - solo se
// pide si el negocio realmente tiene la feature activa (`enabled`), para no
// disparar un 403/404 innecesario en negocios sin insumos.
export function useIngredientOptions(enabled: ComputedRef<boolean>) {
  return useQuery({
    queryKey: ['ingredients', 'options'],
    queryFn: fetchIngredientOptions,
    enabled,
  })
}
