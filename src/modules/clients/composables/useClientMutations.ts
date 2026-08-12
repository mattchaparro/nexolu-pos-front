import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ClientPayload } from '@/types/client'

import { createClient, deleteClient, updateClient } from '../services/clientService'

export function useClientMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clients'] })

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<ClientPayload> }) => updateClient(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
