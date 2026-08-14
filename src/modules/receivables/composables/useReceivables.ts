import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { ReceivableStatus } from '@/types/receivable'

import { fetchReceivables } from '../services/receivableService'

export function useReceivables(status: Ref<ReceivableStatus | ''>, search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['receivables', status.value, search.value, page.value] as const),
    queryFn: () =>
      fetchReceivables({
        status: status.value || undefined,
        search: search.value || undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}
