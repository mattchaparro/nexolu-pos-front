// Refleja ExpenseResource, ExpenseTypeResource y FixedExpenseTemplateResource
// (app/Http/Resources/Api/V1/) en nexolu-pos-api.

export interface ExpenseType {
  id: number
  business_id: number | null
  name: string
  slug: string
}

export interface Expense {
  id: number
  business_id: number
  date: string
  description: string
  value: string
  scope: 'operacional' | 'administrativo' | null
  payment_method: string | null
  type: ExpenseType | null
  linkable_type: string | null
  linkable_id: number | null
}

export interface FixedExpenseTemplate {
  id: number
  business_id: number
  name: string
  amount: string | null
  expense_type: ExpenseType | null
  active: boolean
  scope: 'operacional' | 'administrativo' | null
  day_of_month: number | null
  registered_this_month: boolean
  has_active_reminder: boolean
  created_at: string
}

// Payloads ----------------------------------------------------------------

export interface ExpensePayload {
  date: string
  description: string
  value: number
  type_id: number
  scope?: 'operacional' | 'administrativo' | null
  payment_method?: string | null
  linkable_type?: string | null
  linkable_id?: number | null
  reminder_date?: string | null
  reminder_recurrence?: string | null
  reminder_end_date?: string | null
  reminder_notes?: string | null
}

export interface FixedExpenseTemplatePayload {
  name: string
  amount?: number | null
  expense_type_id?: number | null
  active?: boolean
  day_of_month?: number | null
  scope?: 'operacional' | 'administrativo' | null
}
