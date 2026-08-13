import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { ServiceOrderStatus } from '@/types/serviceOrder'

import { fetchServiceOrders, fetchServiceOrdersSummary } from '../services/serviceOrderService'

export function useServiceOrders(
  status: Ref<ServiceOrderStatus | ''>,
  search: Ref<string>,
  page: Ref<number>,
  stageId: Ref<number | null>,
) {
  return useQuery({
    queryKey: computed(() => ['service-orders', status.value, search.value, page.value, stageId.value] as const),
    queryFn: () =>
      fetchServiceOrders({
        status: status.value || undefined,
        search: search.value || undefined,
        stage_id: stageId.value ?? undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useServiceOrdersSummary() {
  return useQuery({
    queryKey: ['service-orders', 'summary'],
    queryFn: fetchServiceOrdersSummary,
  })
}
