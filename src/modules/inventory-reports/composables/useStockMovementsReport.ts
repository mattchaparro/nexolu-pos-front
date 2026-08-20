import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchStockMovements, type MovementsFilters } from '../services/inventoryReportService'

export function useStockMovementsReport(page: Ref<number>, filters: Ref<MovementsFilters>) {
  return useQuery({
    queryKey: computed(() => ['inventory-movements', page.value, filters.value]),
    queryFn: () => fetchStockMovements(page.value, filters.value),
    placeholderData: keepPreviousData,
  })
}
