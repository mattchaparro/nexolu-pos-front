// Refleja SaleResource/SaleItemResource (app/Http/Resources/Api/V1) y el
// payload que espera StoreSaleRequest en nexolu-pos-api. Solo cubre venta
// directa (POST /sales) - payment_splits/partial_payments (cuentas
// abiertas) se tipan cuando exista ese modulo.
import type { Product } from './product'

export interface SaleItemInput {
  product_id: number
  quantity: number
  /** Solo obligatorio si el producto es price_varies_at_sale. */
  unit_price?: number
  discount_id?: number | null
}

export interface CreateSalePayload {
  items: SaleItemInput[]
  payment_method?: string | null
  customer_name?: string
  customer_phone?: string
  customer_identification?: string
  is_delivery?: boolean
  is_non_revenue?: boolean
  non_revenue_reason?: string
  cart_discount_id?: number | null
  apply_service_charge?: boolean
  apply_ipoconsumo?: boolean
}

export interface SaleItem {
  id: number
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
  discount_id: number | null
  discount_amount: number
}

export interface Sale {
  id: number
  business_id: number
  user_id: number
  table_id: number | null
  invoice_number: string | null
  payment_method: string | null
  status: 'open' | 'closed'
  total: number
  cart_discount_id: number | null
  cart_discount_amount: number
  service_charge_amount: number
  ipoconsumo_amount: number
  is_delivery: boolean
  delivery_fee: number
  is_non_revenue: boolean
  non_revenue_reason: string | null
  is_credit: boolean
  customer_name: string | null
  customer_phone: string | null
  customer_identification: string | null
  closed_at: string | null
  items: SaleItem[]
}
