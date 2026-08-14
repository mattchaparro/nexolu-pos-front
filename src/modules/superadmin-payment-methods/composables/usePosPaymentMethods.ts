import { useQuery } from '@tanstack/vue-query'

import { fetchPosPaymentMethods } from '../services/posPaymentMethodService'

export function usePosPaymentMethods() {
  return useQuery({
    queryKey: ['superadmin', 'pos-payment-methods'],
    queryFn: fetchPosPaymentMethods,
  })
}
