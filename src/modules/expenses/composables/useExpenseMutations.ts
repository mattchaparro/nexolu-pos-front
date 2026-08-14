import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ExpensePayload } from '@/types/expense'

import { createExpense, deleteExpense, updateExpense } from '../services/expenseService'

export function useExpenseMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expenses'] })

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<ExpensePayload> }) =>
      updateExpense(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
