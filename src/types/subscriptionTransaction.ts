/**
 * Intentos de cobro de la suscripcion mensual contra el Nexolu Payments Core
 * (App\Http\Resources\Api\V1\SuperAdmin\SubscriptionCheckoutOrderResource).
 */

export type SubscriptionOrderStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled'

export interface SubscriptionTransaction {
  id: number
  business: { id: number; name: string } | null
  business_id: number | null
  order_key: string
  amount_cop: number
  ai_addon_included: boolean
  ai_addon_amount_cop: number | null
  subscription_days: number
  status: SubscriptionOrderStatus
  provider: string | null
  provider_order_id: string | null
  /**
   * El estado que respondio la pasarela, que no siempre coincide con el
   * nuestro: nosotros solo tenemos confirmed/failed/pending y el proveedor
   * distingue DECLINED de ERROR — la diferencia entre "la tarjeta no tiene
   * fondos" y "algo se rompio de nuestro lado".
   */
  provider_status: string | null
  provider_event: string | null
  fee_cop: number | null
  net_amount_cop: number | null
  payload: Record<string, unknown> | null
  /** Pendiente sin novedad hace mas de una hora: checkout abandonado, no cobro en vuelo. */
  pending_stale: boolean
  confirmed_at: string | null
  created_at: string
}

export interface SubscriptionTransactionsSummary {
  by_status: Record<string, { orders: number; amount_cop: number }>
  orders: number
  collected_cop: number
  /** Sobre los intentos RESUELTOS (confirmados + fallidos), no sobre el total. */
  success_rate_pct: number | null
}
