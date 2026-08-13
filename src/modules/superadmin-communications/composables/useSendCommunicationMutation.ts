import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { SendBusinessCommunicationPayload } from '@/types/superadmin/communication'

import { sendBusinessCommunication } from '../services/communicationService'

export function useSendCommunicationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { businessId: number; payload: SendBusinessCommunicationPayload }) =>
      sendBusinessCommunication(params.businessId, params.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin', 'communications'] }),
  })
}
