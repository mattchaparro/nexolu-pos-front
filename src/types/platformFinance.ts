/** GET /superadmin/finance. */

export interface PlatformFinanceExpenses {
  usd_to_cop_rate: number
  server_cop: number
  domain_cop: number
  ai_cop: number
  /** false = no se pudo consultar el costo real al IA Core; `ai_cop` no es confiable. */
  ai_cost_available: boolean
  messaging_cop: number
  messaging_cost_available: boolean
  total_cop: number
}

export interface PlatformFinanceSummary {
  year: number
  month: number
  is_current_month: boolean
  income: {
    total_cop: number
    count: number
    by_payment_method: Record<string, number>
  }
  expenses: PlatformFinanceExpenses
  margin: { cop: number; percent: number | null }
  /** Solo en el mes en curso: extrapola lo acumulado hasta hoy. */
  projection: { days_elapsed: number; days_in_month: number; income_cop: number } | null
}

export interface PlatformFinanceResponse {
  summary: PlatformFinanceSummary
  /** Lo que deberia entrar el proximo ciclo segun los planes activos. */
  mrr_cop: number
}
