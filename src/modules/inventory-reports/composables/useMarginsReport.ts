import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchMargins, type MarginsFilters } from '../services/inventoryReportService'

export function useMarginsReport(filters: Ref<MarginsFilters>) {
  return useQuery({
    queryKey: computed(() => ['inventory-margins', filters.value]),
    queryFn: () => fetchMargins(filters.value),
  })
}
