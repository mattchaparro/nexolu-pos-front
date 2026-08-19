// Refleja SaleResource/SaleItemResource (app/Http/Resources/Api/V1) y los
// payloads que esperan StoreSaleRequest/StoreOpenTabRequest/etc en
// nexolu-pos-api. Sale cubre tanto venta directa (status='closed' siempre)
// como cuenta abierta (status='open'|'closed', con payment_splits/
// partial_payments) - un solo modelo en el back, un solo tipo aca.
import type { Product } from './product'

export interface SaleItemInput {
  product_id: number
  quantity: number
  /** Solo obligatorio si el producto es price_varies_at_sale. */
  unit_price?: number
  discount_id?: number | null
}

export interface PaymentSplitInput {
  method: string
  amount: number
  label?: string | null
}

export interface CreateSalePayload {
  items: SaleItemInput[]
  payment_method?: string | null
  payment_splits?: PaymentSplitInput[]
  customer_name?: string
  customer_phone?: string
  customer_identification?: string
  client_id?: number | null
  is_delivery?: boolean
  is_non_revenue?: boolean
  non_revenue_reason?: string | null
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

export interface SalePaymentSplit {
  id: number
  payment_method: string
  amount: number
  payer_label: string | null
}

export interface SalePartialPayment {
  id: number
  amount: number
  payment_method: string
  payer_label: string | null
  user_id: number
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
  client_id: number | null
  closed_at: string | null
  items: SaleItem[]
  payment_splits?: SalePaymentSplit[]
  partial_payments?: SalePartialPayment[]
  /** Solo vienen cuando partial_payments esta cargado en el back. */
  amount_paid?: number
  balance_due?: number
}
