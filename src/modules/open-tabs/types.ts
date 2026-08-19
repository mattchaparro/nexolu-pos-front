// Payloads que esperan StoreOpenTabRequest/OpenTabItemsRequest/
// RecordPartialPaymentRequest/CloseOpenTabRequest en nexolu-pos-api.
import type { PaymentSplitInput, SaleItemInput } from '@/types/sale'

export type { PaymentSplitInput }

export interface OpenTabPayload {
  table_id?: number | null
  customer_name?: string | null
  customer_phone?: string | null
  is_delivery?: boolean
  items: SaleItemInput[]
}

export interface OpenTabItemsPayload {
  items: SaleItemInput[]
}

export interface RecordPartialPaymentPayload {
  amount: number
  payment_method: string
  payer_label?: string | null
}

export interface CloseOpenTabPayload {
  payment_method?: string | null
  payment_splits?: PaymentSplitInput[]
  is_non_revenue?: boolean
  non_revenue_reason?: string | null
  customer_name?: string
  customer_phone?: string
  customer_identification?: string
  client_id?: number | null
  apply_service_charge?: boolean
  apply_ipoconsumo?: boolean
}
