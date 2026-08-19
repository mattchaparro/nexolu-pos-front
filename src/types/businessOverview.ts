// Refleja BusinessOverviewService::overview() (nexolu-pos-api) - GET
// /reports/sales/business-overview. Deliberadamente distinto de
// DailySummary (types/dailySummary.ts): esto es "Mi negocio", el reporte de
// crecimiento/patron/rotacion, no el detalle transaccional del dia.

export interface PeriodTotals {
  revenue: number
  sales_count: number
  avg_ticket: number
}

export interface BusinessOverviewPulse {
  today: PeriodTotals
  yesterday: PeriodTotals
  today_vs_yesterday_pct: number | null
  this_week: PeriodTotals
  last_week: PeriodTotals
  week_vs_last_week_pct: number | null
}

export interface TrendDay {
  date: string
  revenue: number
  sales_count: number
}

export interface BusinessOverviewTrend {
  days: TrendDay[]
}

export interface HeatmapCell {
  weekday: number // 0=domingo..6=sabado
  hour: number // 0-23
  revenue: number
  sales_count: number
}

export interface HeatmapPeak {
  weekday: number
  hour: number
  revenue: number
}

export interface BusinessOverviewHeatmap {
  cells: HeatmapCell[]
  peak: HeatmapPeak | null
  slow: HeatmapPeak | null
}

export interface PeriodSummary {
  revenue: number
  sales_count: number
  avg_ticket: number
  units_sold: number
  expenses_total: number
  net_estimate: number
  revenue_change_pct: number | null
}

export interface PeriodDiscounts {
  total: number
  pct_of_revenue: number | null
}

export interface PeriodReceivables {
  outstanding_total: number
  outstanding_count: number
  collected_this_period: number
}

export interface ProductRotation {
  product_id: number
  name: string
  sku: string | null
  quantity: number
  revenue: number
  pct_of_revenue: number | null
}

export interface ServiceRotation {
  name: string
  orders_count: number
  collected: number
}

export interface ProfitProduct {
  product_id: number
  name: string
  sku: string | null
  qty_sold: number
  revenue: number
  cost_total: number
  profit: number
  margin_pct: number | null
}

// Null cuando el usuario no tiene el permiso accounting.manage: expone
// rentabilidad real (costo/utilidad), no solo reportes de venta, asi que se
// gatea aparte de reports.sales (que ya protege el resto del endpoint).
export interface PeriodProfit {
  revenue: number
  cost: number
  profit: number
  margin_pct: number | null
  uncosted_products_count: number
  uncosted_revenue: number
  top_products: ProfitProduct[]
}

export interface BusinessOverviewPeriod {
  year: number
  month: number
  summary: PeriodSummary
  discounts: PeriodDiscounts
  receivables: PeriodReceivables | null
  top_products: ProductRotation[]
  bottom_products: ProductRotation[]
  top_services: ServiceRotation[] | null
  profit: PeriodProfit | null
}

export interface BusinessOverview {
  pulse: BusinessOverviewPulse
  trend: BusinessOverviewTrend
  heatmap: BusinessOverviewHeatmap
  period: BusinessOverviewPeriod
  channels_enabled: {
    services: boolean
    receivables: boolean
    layaway: boolean
    expenses: boolean
  }
}
