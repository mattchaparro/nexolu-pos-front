import { httpClient } from '@/services/http/client'
import type { Reminder, ReminderPayload, RemindersResponse } from '@/types/reminder'

export async function fetchReminders(): Promise<RemindersResponse> {
  const { data } = await httpClient.get<RemindersResponse>('/reminders')
  return data
}

export async function createReminder(payload: ReminderPayload): Promise<Reminder> {
  const { data } = await httpClient.post<Reminder>('/reminders', payload)
  return data
}

export async function deleteReminder(id: number): Promise<void> {
  await httpClient.delete(`/reminders/${id}`)
}

export async function completeReminder(id: number): Promise<Reminder> {
  const { data } = await httpClient.post<Reminder>(`/reminders/${id}/complete`)
  return data
}

export async function postponeReminder(id: number, dueDate: string): Promise<Reminder> {
  const { data } = await httpClient.post<Reminder>(`/reminders/${id}/postpone`, { due_date: dueDate })
  return data
}
