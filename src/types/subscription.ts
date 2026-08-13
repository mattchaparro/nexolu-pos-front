// Refleja SubscriptionController (nexolu-pos-api): estado de la
// suscripcion del negocio autenticado + desglose de precio
// (SubscriptionPricingService::breakdown) + checkout via Nexolu Payments
// Core (Wompi por detras).
export type SubscriptionStatus = 'inactive' | 'paid' | 'trial' | 'expired'

export interface SubscriptionPricing {
  plan_standard_cop: number
  plan_base_cop: number
  has_custom_price: boolean
  promo_discount_percent: number
  promo_months: number
  paid_cycles: number
  is_promo_eligible: boolean
  promo_discount_cop: number
  plan_after_promo_cop: number
  total_cop: number
}

export interface SubscriptionPayment {
  id: number
  amount_cop: number
  period_label: string
  paid_at: string | null
  payment_method: string | null
  days_granted: number | null
}

export interface SubscriptionStatusResponse {
  status: SubscriptionStatus
  days_remaining: number
  trial_ends_at: string | null
  paid_until: string | null
  pricing: SubscriptionPricing
  payments: SubscriptionPayment[]
}

// checkout.* llega en snake_case (Nexolu Payments Core); son los mismos
// parametros que espera window.WidgetCheckout de Wompi (checkout.wompi.co/widget.js).
export interface SubscriptionCheckoutIntent {
  order_key: string
  amount_cop: number
  checkout: {
    public_key: string
    amount_in_cents: number
    reference: string
    integrity_signature: string
  }
}

export interface SubscriptionCheckoutStatus {
  order_key: string
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
  amount_cop: number
  confirmed_at: string | null
  provider_status?: string | null
}
