// Refleja DashboardService::todaySummary() (app/Services/DashboardService.php)
// en nexolu-pos-api - mantener sincronizado si el endpoint cambia.
export interface DashboardSummary {
  today_sales: number
  today_count: number
  open_tabs_total: number
  receivables_enabled: boolean
  pending_receivables: number
  expenses_enabled: boolean
  today_expenses: number
}
