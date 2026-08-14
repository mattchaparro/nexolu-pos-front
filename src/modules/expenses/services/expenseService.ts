import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type { Expense, ExpensePayload, ExpenseType, FixedExpenseTemplate, FixedExpenseTemplatePayload } from '@/types/expense'

// ---------- Expense Types ----------

export async function fetchExpenseTypes(): Promise<ExpenseType[]> {
  const { data } = await httpClient.get<ExpenseType[]>('/expense-types')
  return data
}

export async function createExpenseType(name: string): Promise<ExpenseType> {
  const { data } = await httpClient.post<ExpenseType>('/expense-types', { name })
  return data
}

// ---------- Expenses ----------

export interface FetchExpensesParams {
  month?: number
  year?: number
  type_id?: number
  search?: string
  page?: number
}

export async function fetchExpenses(params: FetchExpensesParams = {}): Promise<PaginatedResponse<Expense>> {
  const { data } = await httpClient.get<PaginatedResponse<Expense>>('/expenses', { params })
  return data
}

export async function createExpense(payload: ExpensePayload): Promise<Expense> {
  const { data } = await httpClient.post<Expense>('/expenses', payload)
  return data
}

export async function updateExpense(id: number, payload: Partial<ExpensePayload>): Promise<Expense> {
  const { data } = await httpClient.put<Expense>(`/expenses/${id}`, payload)
  return data
}

export async function deleteExpense(id: number): Promise<void> {
  await httpClient.delete(`/expenses/${id}`)
}

// ---------- Fixed Expense Templates ----------

export async function fetchFixedExpenseTemplates(): Promise<FixedExpenseTemplate[]> {
  const { data } = await httpClient.get<FixedExpenseTemplate[]>('/fixed-expense-templates')
  return data
}

export async function createFixedExpenseTemplate(payload: FixedExpenseTemplatePayload): Promise<FixedExpenseTemplate> {
  const { data } = await httpClient.post<FixedExpenseTemplate>('/fixed-expense-templates', payload)
  return data
}

export async function updateFixedExpenseTemplate(id: number, payload: Partial<FixedExpenseTemplatePayload>): Promise<FixedExpenseTemplate> {
  const { data } = await httpClient.put<FixedExpenseTemplate>(`/fixed-expense-templates/${id}`, payload)
  return data
}

export async function deleteFixedExpenseTemplate(id: number): Promise<void> {
  await httpClient.delete(`/fixed-expense-templates/${id}`)
}

export async function registerFixedExpenseNow(id: number, year: number, month: number, amount?: number | null): Promise<Expense> {
  const { data } = await httpClient.post<Expense>(`/fixed-expense-templates/${id}/register-now`, {
    year,
    month,
    amount: amount ?? undefined,
  })
  return data
}

export async function toggleFixedExpenseReminder(id: number): Promise<{ active: boolean }> {
  const { data } = await httpClient.post<{ active: boolean }>(`/fixed-expense-templates/${id}/toggle-reminder`)
  return data
}
