export interface SellerPaymentMethodTotal {
  id: string
  label: string
  total: number
}

export interface SellerSummary {
  user_id: number | null
  user_name: string
  sales_count: number
  gross_total: number
  avg_ticket: number
  items_sold: number
  last_sale_at: string | null
  methods: SellerPaymentMethodTotal[]
}

export interface SalesBySellerTotals {
  sales_count: number
  gross_total: number
  avg_ticket: number
  sellers_count: number
}

export interface SalesBySellerResponse {
  from: string
  to: string
  totals: SalesBySellerTotals
  sellers: SellerSummary[]
}
