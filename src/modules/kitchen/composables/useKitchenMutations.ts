import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { UpdateKitchenStatusPayload } from '@/types/kitchenTicket'

import { dispatchOnlineOrder, updateKitchenStatus } from '../services/kitchenService'

export function useKitchenMutations() {
  const queryClient = useQueryClient()

  const updateStatusMutation = useMutation({
    mutationFn: (params: { saleId: number; payload: UpdateKitchenStatusPayload }) =>
      updateKitchenStatus(params.saleId, params.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] }),
  })

  const dispatchMutation = useMutation({
    mutationFn: (saleId: number) => dispatchOnlineOrder(saleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  return { updateStatusMutation, dispatchMutation }
}
