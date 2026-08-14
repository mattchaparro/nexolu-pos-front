import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { FixedExpenseTemplatePayload } from '@/types/expense'

import {
  createFixedExpenseTemplate,
  deleteFixedExpenseTemplate,
  registerFixedExpenseNow,
  toggleFixedExpenseReminder,
  updateFixedExpenseTemplate,
} from '../services/expenseService'

export function useFixedExpenseTemplateMutations() {
  const queryClient = useQueryClient()

  const invalidateTemplates = () => queryClient.invalidateQueries({ queryKey: ['fixed-expense-templates'] })
  const invalidateAll = () => {
    invalidateTemplates()
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }

  const createMutation = useMutation({
    mutationFn: createFixedExpenseTemplate,
    onSuccess: invalidateTemplates,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<FixedExpenseTemplatePayload> }) =>
      updateFixedExpenseTemplate(params.id, params.payload),
    onSuccess: invalidateTemplates,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFixedExpenseTemplate,
    onSuccess: invalidateTemplates,
  })

  const registerNowMutation = useMutation({
    mutationFn: (params: { id: number; year: number; month: number; amount?: number | null }) =>
      registerFixedExpenseNow(params.id, params.year, params.month, params.amount),
    onSuccess: invalidateAll,
  })

  const toggleReminderMutation = useMutation({
    mutationFn: toggleFixedExpenseReminder,
    onSuccess: invalidateTemplates,
  })

  return { createMutation, updateMutation, deleteMutation, registerNowMutation, toggleReminderMutation }
}
