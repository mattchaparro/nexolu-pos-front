import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { PurchasePaymentStatus } from '@/types/purchase'

import { fetchPurchases } from '../services/purchaseService'

export function usePurchases(
  from: Ref<string>,
  to: Ref<string>,
  paymentStatus: Ref<PurchasePaymentStatus | ''>,
  page: Ref<number>,
) {
  return useQuery({
    queryKey: computed(() => ['purchases', from.value, to.value, paymentStatus.value, page.value] as const),
    queryFn: () =>
      fetchPurchases({
        from: from.value || undefined,
        to: to.value || undefined,
        payment_status: paymentStatus.value || undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}
