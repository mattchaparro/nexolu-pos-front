import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ReminderPayload } from '@/types/reminder'

import { completeReminder, createReminder, deleteReminder, postponeReminder } from '../services/reminderService'

export function useReminderMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reminders'] })

  const createMutation = useMutation({
    mutationFn: (payload: ReminderPayload) => createReminder(payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteReminder(id),
    onSuccess: invalidate,
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => completeReminder(id),
    onSuccess: invalidate,
  })

  const postponeMutation = useMutation({
    mutationFn: ({ id, dueDate }: { id: number; dueDate: string }) => postponeReminder(id, dueDate),
    onSuccess: invalidate,
  })

  return { createMutation, deleteMutation, completeMutation, postponeMutation }
}
