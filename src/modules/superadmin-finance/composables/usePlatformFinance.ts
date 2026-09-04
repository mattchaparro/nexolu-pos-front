import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchPlatformFinance } from '../services/financeService'

export function usePlatformFinance(year: Ref<number>, month: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'finance', year.value, month.value] as const),
    queryFn: () => fetchPlatformFinance(year.value, month.value),
    // Cambiar de mes no deberia vaciar la pantalla: en blanco parece que el
    // mes elegido no tiene datos, cuando solo esta cargando.
    placeholderData: keepPreviousData,
  })
}
