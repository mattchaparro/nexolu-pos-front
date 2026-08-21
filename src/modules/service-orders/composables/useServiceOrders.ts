import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { ServiceOrderStatus } from '@/types/serviceOrder'

import { fetchServiceOrders, fetchServiceOrdersSummary } from '../services/serviceOrderService'

export function useServiceOrders(
  status: Ref<ServiceOrderStatus | ''>,
  search: Ref<string>,
  page: Ref<number>,
  stageId: Ref<number | null>,
  dateFrom: Ref<string>,
  dateTo: Ref<string>,
) {
  return useQuery({
    queryKey: computed(() => ['service-orders', status.value, search.value, page.value, stageId.value, dateFrom.value, dateTo.value] as const),
    queryFn: () =>
      fetchServiceOrders({
        status: status.value || undefined,
        search: search.value || undefined,
        stage_id: stageId.value ?? undefined,
        date_from: dateFrom.value || undefined,
        date_to: dateTo.value || undefined,
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
