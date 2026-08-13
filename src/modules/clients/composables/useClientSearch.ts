import { refDebounced } from '@vueuse/core'
import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { searchClients } from '../services/clientService'

// Debounced: sin esto, cada tecla dispara su propio request (11 requests
// para un telefono de 10 digitos) - ademas de saturar el backend, las
// respuestas siguen resolviendo despues de que el usuario dejo de tipear,
// reemplazando la lista ya renderizada justo cuando intenta hacer click en
// una opcion.
export function useClientSearch(search: Ref<string>) {
  const debouncedSearch = refDebounced(search, 300)

  return useQuery({
    queryKey: computed(() => ['clients', 'search', debouncedSearch.value] as const),
    queryFn: () => searchClients(debouncedSearch.value),
  })
}
