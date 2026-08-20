import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchSalesHistory, type SalesHistoryFilters } from '../services/salesHistoryService'

export function useSalesHistory(from: Ref<string>, to: Ref<string>, page: Ref<number>, filters: Ref<SalesHistoryFilters>) {
  return useQuery({
    queryKey: computed(() => ['sales-history', from.value, to.value, page.value, filters.value]),
    queryFn: () => fetchSalesHistory(from.value, to.value, page.value, 20, filters.value),
    placeholderData: keepPreviousData,
  })
}
