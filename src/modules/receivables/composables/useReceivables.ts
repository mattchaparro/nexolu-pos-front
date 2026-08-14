import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { ReceivableStatus } from '@/types/receivable'

import { fetchReceivables } from '../services/receivableService'

export function useReceivables(
  status: Ref<ReceivableStatus | ''>,
  search: Ref<string>,
  page: Ref<number>,
  dateFrom: Ref<string>,
  dateTo: Ref<string>,
) {
  return useQuery({
    queryKey: computed(() => ['receivables', status.value, search.value, page.value, dateFrom.value, dateTo.value] as const),
    queryFn: () =>
      fetchReceivables({
        status: status.value || undefined,
        search: search.value || undefined,
        date_from: dateFrom.value || undefined,
        date_to: dateTo.value || undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}
