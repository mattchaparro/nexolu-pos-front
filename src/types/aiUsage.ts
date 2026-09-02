/** Panel de "Uso y costos IA" del SuperAdmin (GET /superadmin/ai/usage). */

export interface AiUsageTotals {
  messages: number
  businesses: number
}

export interface AiUsageSummary {
  today: AiUsageTotals
  month: AiUsageTotals
  total: AiUsageTotals
  /**
   * null = el IA Core no respondio. NO es cero: el costo no vive en pos-api,
   * asi que "no se sabe" y "no gasto nada" son cosas distintas y la pantalla
   * tiene que distinguirlas.
   */
  month_cost_usd: number | null
  cost_per_message_usd: number | null
  monthly_included_messages: number
  pack_size: number
  pack_price_cop: number
  pack_cost_usd: number | null
}

export interface AiUsageBusinessRow {
  business_id: number
  name: string
  plan: string | null
  state: 'bloqueado' | 'contratado' | 'incluido'
  messages: number
  monthly_quota: number
  quota_used_pct: number | null
  pack_balance: number
  cost_usd: number | null
  last_used_on: string
}

export interface AiUnansweredRow {
  id: number
  question: string
  answer: string | null
  times: number
  businesses: number
  last_seen_at: string
}

export interface AiUsageResponse {
  summary: AiUsageSummary
  businesses: AiUsageBusinessRow[]
  unanswered: AiUnansweredRow[]
}
