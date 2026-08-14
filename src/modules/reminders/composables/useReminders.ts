import { useQuery } from '@tanstack/vue-query'

import { fetchReminders } from '../services/reminderService'

export function useReminders() {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: fetchReminders,
  })
}
