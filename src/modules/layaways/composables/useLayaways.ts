import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { LayawayStatus } from '@/types/layaway'

import { fetchLayaways } from '../services/layawayService'

export function useLayaways(
  status: Ref<LayawayStatus | ''>,
  search: Ref<string>,
  page: Ref<number>,
  dateFrom: Ref<string>,
  dateTo: Ref<string>,
) {
  return useQuery({
    queryKey: computed(() => ['layaways', status.value, search.value, page.value, dateFrom.value, dateTo.value] as const),
    queryFn: () =>
      fetchLayaways({
        status: status.value || undefined,
        search: search.value || undefined,
        date_from: dateFrom.value || undefined,
        date_to: dateTo.value || undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}
