import { useQuery } from '@tanstack/vue-query'

import { fetchBusinessPaymentMethods } from '@/services/business'

export function useBusinessPaymentMethods() {
  return useQuery({
    queryKey: ['business', 'payment-methods'],
    queryFn: fetchBusinessPaymentMethods,
  })
}
