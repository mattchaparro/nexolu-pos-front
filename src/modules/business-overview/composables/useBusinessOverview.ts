import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchBusinessOverview } from '../services/businessOverviewService'

export function useBusinessOverview(year: Ref<number>, month: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['business-overview', year.value, month.value] as const),
    queryFn: () => fetchBusinessOverview(year.value, month.value),
    placeholderData: keepPreviousData,
  })
}
