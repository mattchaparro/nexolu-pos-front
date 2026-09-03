import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchSystemLogs } from '../services/systemLogService'

export function useSystemLogs(
  tab: Ref<'errors' | 'logs'>,
  level: Ref<string | null>,
  search: Ref<string>,
  date: Ref<string | null>,
  page: Ref<number>,
) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'system-logs', tab.value, level.value, search.value, date.value, page.value] as const),
    queryFn: () =>
      fetchSystemLogs({
        tab: tab.value,
        level: level.value ?? undefined,
        search: search.value || undefined,
        date: date.value ?? undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
    // El log cambia solo: relee al volver a la pestaña, que es justo cuando
    // se esta esperando a que aparezca el error que se acaba de reproducir.
    refetchOnWindowFocus: true,
  })
}
