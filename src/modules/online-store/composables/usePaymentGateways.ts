import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import {
  connectPaymentGateway,
  disconnectPaymentGateway,
  fetchPaymentGateways,
} from '../services/paymentGatewayService'

export function usePaymentGateways() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payment-gateways'] })

  const gatewaysQuery = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: fetchPaymentGateways,
  })

  const connectMutation = useMutation({
    mutationFn: connectPaymentGateway,
    onSuccess: invalidate,
  })

  const disconnectMutation = useMutation({
    mutationFn: disconnectPaymentGateway,
    onSuccess: invalidate,
  })

  return { gatewaysQuery, connectMutation, disconnectMutation }
}
