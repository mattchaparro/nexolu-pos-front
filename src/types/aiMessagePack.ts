export interface AiQuotaState {
  monthly_quota: number
  applicable_quota: number
  consumed_this_month: number
  remaining_quota: number
  pack_balance: number
  pack_size: number
  pack_price_cop: number
  is_admin: boolean
}

export interface AiMessagePackCheckoutIntent {
  order_key: string
  amount_cop: number
  checkout: {
    public_key: string
    amount_in_cents: number
    reference: string
    integrity_signature: string
  }
}

export interface AiMessagePackCheckoutStatus {
  order_key: string
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
  amount_cop: number
  messages: number
  confirmed_at: string | null
  provider_status?: string | null
}
