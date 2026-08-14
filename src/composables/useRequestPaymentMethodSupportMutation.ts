import { useMutation } from '@tanstack/vue-query'

import { requestPaymentMethodSupport } from '@/services/business'

export function useRequestPaymentMethodSupportMutation() {
  return useMutation({
    mutationFn: requestPaymentMethodSupport,
  })
}
