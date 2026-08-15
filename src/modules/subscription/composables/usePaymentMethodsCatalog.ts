import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchPaymentMethods, fetchPseFinancialInstitutions } from '../services/paymentMethodsService'

export function usePaymentMethodsCatalog() {
  return useQuery({ queryKey: ['payment-methods'], queryFn: fetchPaymentMethods })
}

/** `enabled` evita pedir la lista de bancos si PSE ni siquiera esta
 * disponible para este comercio (ver usePaymentMethodsCatalog). */
export function usePseFinancialInstitutions(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['pse-financial-institutions'],
    queryFn: fetchPseFinancialInstitutions,
    enabled: computed(() => enabled.value),
  })
}
