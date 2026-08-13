import { useQuery } from '@tanstack/vue-query'

import { fetchSubscriptionStatus } from '../services/subscriptionService'

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['subscription', 'status'],
    queryFn: fetchSubscriptionStatus,
  })
}
