import { refDebounced } from '@vueuse/core'
import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { searchClients } from '../services/clientService'

// Debounced: sin esto, cada tecla dispara su propio request (11 requests
// para un telefono de 10 digitos) - ademas de saturar el backend, las
// respuestas siguen resolviendo despues de que el usuario dejo de tipear,
// reemplazando la lista ya renderizada justo cuando intenta hacer click en
// una opcion.
//
// enabled: la feature "clients" puede estar apagada para el negocio - sin
// esto la query se disparaba igual al montar el picker (aunque quedara
// oculto por v-if en el template), y GET /clients/search devuelve 403 para
// esos negocios (mismo patron que useIngredients.ts).
export function useClientSearch(search: Ref<string>, enabled: Ref<boolean>) {
  const debouncedSearch = refDebounced(search, 300)

  return useQuery({
    queryKey: computed(() => ['clients', 'search', debouncedSearch.value] as const),
    queryFn: () => searchClients(debouncedSearch.value),
    enabled,
  })
}
