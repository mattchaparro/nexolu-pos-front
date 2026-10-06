// Venta financiada por terceros (Addi, Banti...) - ver FinancingController
// en nexolu-pos-api.
export interface FinancingProvider {
  id: number
  name: string
  expected_payout_days: number | null
  is_active: boolean
}

export interface FinancingProviderPayload {
  name?: string
  expected_payout_days?: number | null
  is_active?: boolean
}

export type FinancingCreditStatus = 'pending' | 'paid'

export interface FinancingCredit {
  id: number
  sale_id: number | null
  invoice_number: string | null
  sale_total: number | null
  provider: FinancingProvider
  amount: number
  approval_number: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_identification: string | null
  status: FinancingCreditStatus
  is_overdue: boolean
  expected_payout_date: string | null
  paid_at: string | null
  payout_method: string | null
  payout_reference: string | null
  received_by: string | null
  notes: string | null
  created_at: string
}

export interface FinancingProviderSummary {
  id: number
  name: string
  is_active: boolean
  pending_count: number
  pending_amount: number
  overdue_count: number
  overdue_amount: number
  paid_this_month_amount: number
}

export interface FinancingSummary {
  providers: FinancingProviderSummary[]
  pending_amount: number
  overdue_amount: number
  paid_this_month_amount: number
}

export interface RegisterPayoutPayload {
  paid_at?: string
  payout_method?: string | null
  payout_reference?: string | null
  notes?: string | null
}

/** Lo que se agrega al cobrar una venta financiada (POST /sales). */
export interface SaleFinancingInput {
  financing_provider_id: number
  amount: number
  approval_number?: string
}
