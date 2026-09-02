import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchSubscriptionTransactions } from '../services/subscriptionTransactionService'

export function useSubscriptionTransactions(
  status: Ref<string | null>,
  businessId: Ref<number | null>,
  search: Ref<string>,
  page: Ref<number>,
) {
  return useQuery({
    queryKey: computed(
      () => ['superadmin', 'subscription-transactions', status.value, businessId.value, search.value, page.value] as const,
    ),
    queryFn: () =>
      fetchSubscriptionTransactions({
        status: status.value ?? undefined,
        business_id: businessId.value ?? undefined,
        search: search.value || undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}
