export interface AccountingIncomeLine {
  date: string
  description: string
  type: string
  type_label: string
  amount: number
}

export interface AccountingExpenseLine {
  date: string
  description: string
  type_name: string
  amount: number
}

export interface ProductProfitLine {
  name: string
  qty_sold: number
  revenue: number
  cost_total: number
  profit: number
}

export interface UncostedProfitLine {
  name: string
  qty_sold: number
  revenue: number
}

export interface ProductProfitLines {
  lines: ProductProfitLine[]
  total_profit: number
  total_revenue: number
  uncosted: {
    lines: UncostedProfitLine[]
    total_revenue: number
    products_count: number
  }
}

export interface AccountingMonthlyReport {
  year: number
  month: number
  period_label: string
  income: number
  expenses: number
  net_result: number
  sales_count: number
  expenses_count: number
  receivables_collected: number
  is_closed: boolean
  closed_at: string | null
  closed_by: string | null
  closed_notes: string | null
  income_lines: AccountingIncomeLine[]
  expense_lines: AccountingExpenseLine[]
  product_profit_lines: ProductProfitLines
}

export interface AccountingAnnualMonth {
  month: number
  label: string
  income: number
  expenses: number
  net_result: number
  sales_count: number
}

export interface AccountingAnnualReport {
  year: number
  months: AccountingAnnualMonth[]
  income_total: number
  expenses_total: number
  net_total: number
}

export interface AccountingPeriodClosing {
  id: number
  year: number
  month: number
  status: string
  notes: string | null
  closed_at: string | null
  closed_by: string | null
}
