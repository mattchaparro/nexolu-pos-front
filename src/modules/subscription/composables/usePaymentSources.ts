import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'

import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { deletePaymentSource, fetchPaymentSources } from '../services/paymentSourcesService'

export function usePaymentSources() {
  return useQuery({ queryKey: ['payment-sources'], queryFn: fetchPaymentSources })
}

/** Elimina un metodo de pago guardado (soft-delete del lado del POS - ver
 * BusinessPaymentSourceController::destroy(), no depende de Wompi). */
export function useRemovePaymentSource() {
  const queryClient = useQueryClient()
  const removing = ref(false)
  const error = ref<string | null>(null)

  async function remove(id: number): Promise<void> {
    removing.value = true
    error.value = null
    try {
      await deletePaymentSource(id)
      await queryClient.invalidateQueries({ queryKey: ['payment-sources'] })
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos eliminar el método de pago.')
    } finally {
      removing.value = false
    }
  }

  return { removing, error, remove }
}
