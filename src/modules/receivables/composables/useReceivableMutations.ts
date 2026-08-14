import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { CollectReceivablePayload } from '@/types/receivable'

import { collectReceivable } from '../services/receivableService'

export function useReceivableMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['receivables'] })

  const collectMutation = useMutation({
    mutationFn: (params: { id: number; payload: CollectReceivablePayload }) =>
      collectReceivable(params.id, params.payload),
    onSuccess: invalidate,
  })

  return { collectMutation }
}
