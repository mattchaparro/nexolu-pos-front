// Refleja SalesReportService::dailySummary() (nexolu-pos-api).
export interface PaymentMethodTotal {
  id: string
  label: string
  total: number
}

export interface IncomeChannel {
  key: 'sales' | 'services' | 'layaways' | 'receivables'
  label: string
  total: number
  count: number
  by_payment_method: PaymentMethodTotal[]
}

export interface RecentSale {
  id: number
  invoice_number: string | null
  total: number
  payment_method: string | null
  payment_splits: { payment_method: string; amount: number }[]
  status: string
  is_non_revenue: boolean
  is_credit: boolean
  table_name: string | null
  customer_name: string | null
  customer_phone: string | null
  user_name: string | null
  created_at: string
  items_preview: string
}

export interface TopProduct {
  product_id: number
  name: string
  total_quantity: number
  total_revenue: number
}

export interface RecentServiceOrder {
  id: number
  service_name: string
  client_name: string | null
  total: number
  amount_paid: number
  amount_paid_today: number
  balance: number
  status: string
  payment_methods_today: string[]
}

export interface RecentLayaway {
  id: number
  customer_name: string | null
  customer_phone: string | null
  amount_paid_today: number
  payment_methods_today: string[]
  status: string
}

export interface RecentReceivable {
  id: number
  customer_name: string | null
  customer_phone: string | null
  amount: number
  payment_method: string | null
  paid_at: string
}

export interface DailySummary {
  date: string
  date_from: string
  date_to: string
  total_sales: number
  total_expenses: number
  net: number
  closed_sales_revenue: number
  collected_receivables_total: number
  service_payments_total: number
  service_payments_count: number
  layaway_payments_total: number
  layaway_payments_count: number
  total_cash: number
  total_transfer: number
  payment_breakdown: PaymentMethodTotal[]
  channels: IncomeChannel[]
  channels_enabled: {
    sales: boolean
    services: boolean
    layaways: boolean
    receivables: boolean
  }
  sales_count: number
  open_count: number
  open_total: number
  total_all: number
  courtesy_total: number
  total_discounts_day: number
  top_products: TopProduct[]
  recent_sales: RecentSale[]
  open_sales: RecentSale[]
  recent_service_orders: RecentServiceOrder[]
  recent_layaways: RecentLayaway[]
  recent_receivables: RecentReceivable[]
}
