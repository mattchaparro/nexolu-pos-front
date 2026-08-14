import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { UpdateKitchenStatusPayload } from '@/types/kitchenTicket'

import { updateKitchenStatus } from '../services/kitchenService'

export function useKitchenMutations() {
  const queryClient = useQueryClient()

  const updateStatusMutation = useMutation({
    mutationFn: (params: { saleId: number; payload: UpdateKitchenStatusPayload }) =>
      updateKitchenStatus(params.saleId, params.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] }),
  })

  return { updateStatusMutation }
}
