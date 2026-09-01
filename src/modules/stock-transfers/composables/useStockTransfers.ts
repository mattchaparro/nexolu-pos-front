import { computed, type Ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { fetchStockTransfers } from '../services/stockTransferService'

export function useStockTransfers(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['stock-transfers', 'list', page.value] as const),
    queryFn: () => fetchStockTransfers({ page: page.value }),
    placeholderData: keepPreviousData,
  })
}
