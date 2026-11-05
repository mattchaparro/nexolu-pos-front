// Refleja SupplierReportController::index() (nexolu-pos-api) - GET
// /reports/suppliers. Los mismos filtros valen para totales, agrupados y detalle.

export interface SupplierReportLine {
  id: number
  purchase_id: number
  date: string | null
  invoice_number: string | null
  supplier_name: string | null
  item_name: string
  quantity: number
  unit_cost_cop: number
  line_total_cop: number
  notes: string | null
}

export interface SupplierReportMonth {
  /** YYYY-MM */
  month: string
  total_cop: number
  purchase_count: number
}

export interface SupplierReportSupplier {
  /** null = compras sin proveedor. */
  supplier_id: number | null
  supplier_name: string
  total_cop: number
  purchase_count: number
  pct_of_total: number | null
  last_purchase_at: string | null
}

export interface SupplierReportResponse {
  data: SupplierReportLine[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
  totals: {
    total_cop: number
    total_qty: number
    purchase_count: number
    supplier_count: number
    month_count: number
  }
  by_month: SupplierReportMonth[]
  by_supplier: SupplierReportSupplier[]
}

export interface SupplierReportFilters {
  from: string
  to: string
  /** null = todos; 'none' = sin proveedor. */
  supplierId: number | 'none' | null
}
