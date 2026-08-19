// Refleja CashShiftResource / CashClosingResource (nexolu-pos-api).

export interface PaymentBreakdownEntry {
  id: string
  label: string
  total: number
}

// Forma comun de CashClosingService::buildTotals() - la usan tanto el
// avance en vivo del turno actual como la vista previa de un cierre de caja.
export interface CashTotals {
  total_sales: number
  total_cash: number
  total_other: number
  opening_cash: number
  total_expenses: number
  expected_cash: number
  payment_breakdown: PaymentBreakdownEntry[]
}

export interface CashShiftUser {
  id: number
  full_name: string
}

export interface CashShift {
  id: number
  business_id: number
  user_id: number
  user: CashShiftUser | null
  opened_at: string
  closed_at: string | null
  opening_cash: number
  opening_note: string | null
  counted_cash: number | null
  expected_cash: number | null
  difference: number | null
  closing_note: string | null
  payment_breakdown: PaymentBreakdownEntry[] | null
  total_sales: number | null
  total_cash: number | null
  total_other_methods: number | null
  total_expenses: number | null
  closed_by_user_id: number | null
  closed_by_user: CashShiftUser | null
  closed_via: 'manual' | 'auto_cash_closing' | null
  closed_by_cash_closing_id: number | null
  is_open: boolean
  is_from_a_previous_day: boolean
}

export interface CashClosing {
  id: number
  business_id: number
  date: string
  total_sales: number
  total_cash: number
  total_other_methods: number
  payment_breakdown: PaymentBreakdownEntry[]
  opening_cash: number
  total_expenses: number
  expected_cash: number
  actual_cash: number
  base_for_next_day: number
  difference: number
  closed_by: number
  closed_by_user: CashShiftUser | null
  created_via: 'manual'
  can_undo: boolean
  created_at: string
}

export interface CurrentShiftResponse {
  shift: CashShift | null
  preview_totals: CashTotals | null
}

export interface CashClosingPreview {
  date: string
  totals: CashTotals
  suggested_opening_cash: number
  existing_closing: CashClosing | null
  shifts_to_auto_close: CashShift[]
}

export interface OpenCashShiftPayload {
  opening_cash: number
  opening_note?: string | null
}

export interface CloseCashShiftPayload {
  counted_cash: number
  closing_note?: string | null
}

export interface StoreCashClosingPayload {
  date: string
  opening_cash: number
  actual_cash: number
  base_for_next_day: number
}
