import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type { SubscriptionTransaction, SubscriptionTransactionsSummary } from '@/types/subscriptionTransaction'

export interface FetchSubscriptionTransactionsParams {
  status?: string
  business_id?: number
  search?: string
  page?: number
}

/** El backend agrega `summary` al lado de `data`/`meta` (Resource::additional). */
type Response = PaginatedResponse<SubscriptionTransaction> & { summary: SubscriptionTransactionsSummary }

export async function fetchSubscriptionTransactions(
  params: FetchSubscriptionTransactionsParams = {},
): Promise<Response> {
  const { data } = await httpClient.get<Response>('/superadmin/subscription-transactions', { params })
  return data
}
