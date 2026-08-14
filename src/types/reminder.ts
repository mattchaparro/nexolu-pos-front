export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReminderStatus = 'pending' | 'done'

export interface Reminder {
  id: number
  business_id: number
  created_by_user_id: number
  title: string
  notes: string | null
  due_date: string | null
  notify_time: string | null
  notify_whatsapp: boolean
  recurrence: ReminderRecurrence
  end_date: string | null
  status: ReminderStatus
  is_recurring: boolean
  is_overdue: boolean
  completed_at: string | null
  remindable_type: string | null
  remindable_id: number | null
  created_at: string
}

export interface RemindersResponse {
  pending: Reminder[]
  completed: Reminder[]
}

export interface ReminderPayload {
  title: string
  notes?: string | null
  due_date: string
  notify_time?: string | null
  notify_whatsapp?: boolean
  recurrence?: ReminderRecurrence
  end_date?: string | null
}
