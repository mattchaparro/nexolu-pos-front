export interface SaleHistoryItem {
  name: string
  is_deleted: boolean
  quantity: number
  subtotal: number
}

export interface SaleHistoryPaymentSplit {
  payment_method: string
  amount: number
}

export interface SaleHistoryRow {
  id: number
  invoice_number: string | null
  total: number
  payment_method: string | null
  payment_splits: SaleHistoryPaymentSplit[]
  status: 'open' | 'closed'
  is_non_revenue: boolean
  is_credit: boolean
  table_name: string | null
  customer_name: string | null
  customer_phone: string | null
  user_name: string | null
  created_at: string
  items_preview: string
  items: SaleHistoryItem[]
}

export interface PaymentMethodOption {
  id: string
  label: string
}

export interface SalesHistoryResponse {
  data: SaleHistoryRow[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  // Solo los medios HABILITADOS del negocio - para el dropdown de filtro.
  payment_method_options: PaymentMethodOption[]
  // TODOS los ids configurados (habilitados o no) - para resolver el label
  // de una fila con un medio que el negocio ya desactivó. No usar para
  // poblar el dropdown de filtro, ver payment_method_options.
  payment_method_labels: Record<string, string>
}
