import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { createTable, deleteTable, updateTable } from '../services/openTabsService'

export function useTableMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tables'] })

  const createMutation = useMutation({
    mutationFn: createTable,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: { name?: string; number?: number; is_active?: boolean } }) =>
      updateTable(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTable,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
