// Refleja LayawayResource/LayawayItemResource/LayawayPaymentResource
// (app/Http/Resources/Api/V1) en nexolu-pos-api. A diferencia de Compras,
// un apartado no tiene proveedor - solo nombre/telefono libres del
// cliente (customer_name/customer_phone), mas un client_id opcional
// (ver CUTOVER_TODO.md #4) cuando esos datos se asociaron a un Client real.
import type { Product } from './product'

export type LayawayStatus = 'open' | 'completed' | 'cancelled'

export interface LayawayItem {
  id: number
  product: Partial<Product> | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface LayawayPayment {
  id: number
  amount: number
  payment_method: string
  notes: string | null
  recorded_by_user_id: number
  created_at: string
}

export interface Layaway {
  id: number
  business_id: number
  customer_name: string | null
  customer_phone: string | null
  client_id: number | null
  status: LayawayStatus
  notes: string | null
  total: number
  paid: number
  balance: number
  created_by_user_id: number
  cancelled_by_user_id: number | null
  cancelled_at: string | null
  items: LayawayItem[]
  payments: LayawayPayment[]
  created_at: string
}

export interface LayawayItemInput {
  product_id: number
  quantity: number
  unit_price?: number | null
}

export interface LayawayPayload {
  customer_name?: string | null
  customer_phone?: string | null
  client_id?: number | null
  notes?: string | null
  items: LayawayItemInput[]
  initial_payment?: number | null
  initial_payment_method?: string | null
}

export interface AddLayawayPaymentPayload {
  amount: number
  payment_method?: string
  notes?: string | null
}
