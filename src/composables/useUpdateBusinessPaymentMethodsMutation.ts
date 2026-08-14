import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { updateBusinessPaymentMethods } from '@/services/business'

export function useUpdateBusinessPaymentMethodsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBusinessPaymentMethods,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'payment-methods'] })
      // El JSON legacy (Business.payment_methods) deja de leerse una vez el
      // negocio migra al catalogo - refrescar tambien /business para que
      // Vender y demas pantallas que consumen business.payment_methods vean
      // el cambio sin recargar la pagina.
      queryClient.invalidateQueries({ queryKey: ['business'] })
    },
  })
}
