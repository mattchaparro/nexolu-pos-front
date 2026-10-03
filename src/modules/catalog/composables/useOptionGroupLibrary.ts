import { useQuery } from '@tanstack/vue-query'
import { type ComputedRef } from 'vue'

import { fetchOptionGroupLibrary } from '../services/catalogService'

// La ruta esta detras de feature:product_options: solo se pide con la funcion activa.
export function useOptionGroupLibrary(enabled: ComputedRef<boolean>) {
  return useQuery({
    queryKey: ['option-groups', 'library'],
    queryFn: fetchOptionGroupLibrary,
    enabled,
  })
}
