import { computed, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { fetchDailySummary } from '../services/dailySummaryService'

export function useDailySummary(dateFrom: Ref<string>, dateTo: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['daily-summary', dateFrom.value, dateTo.value]),
    queryFn: () => fetchDailySummary(dateFrom.value, dateTo.value),
  })
}
