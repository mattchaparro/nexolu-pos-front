export interface StockMovementRow {
  id: number
  created_at: string
  type: 'entry' | 'exit' | 'adjustment' | 'sale'
  reason_code: string | null
  reason_label: string | null
  product_id: number | null
  product_name: string | null
  product_category: string | null
  ingredient_id: number | null
  ingredient_name: string | null
  quantity: number
  user_name: string | null
  notes: string | null
}

export interface StockMovementsResponse {
  data: StockMovementRow[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export interface MarginRow {
  id: number
  name: string
  category: string | null
  stock: number
  price: number
  cost_price: number
  margin_cop: number
  margin_pct: number | null
  profit_total: number
  qty_sold: number | null
  profit_from_sales: number | null
  is_recipe: boolean
}

export interface UncostedSaleRow {
  name: string
  qty_sold: number
  revenue: number
}

export interface NamedOption {
  id: number
  name: string
}

export interface ReasonOption {
  id: number
  code: string
  label: string
}

export interface MarginsResponse {
  margin_rows: MarginRow[]
  uncosted_rows: UncostedSaleRow[]
  categories: NamedOption[]
  reasons: ReasonOption[]
  product_options: NamedOption[]
  ingredient_options: NamedOption[]
  filters: {
    category_id: number | null
    date_from: string
    date_to: string
    with_sales: boolean
  }
}
