import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { ServiceOrderStatus } from '@/types/serviceOrder'

import { fetchServiceOrders } from '../services/serviceOrderService'

export function useServiceOrders(status: Ref<ServiceOrderStatus | ''>, search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['service-orders', status.value, search.value, page.value] as const),
    queryFn: () =>
      fetchServiceOrders({
        status: status.value || undefined,
        search: search.value || undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}
