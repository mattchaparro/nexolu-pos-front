// Refleja Api\V1\SuperAdmin\BusinessResource + el payload compuesto de
// BusinessesController::show() (nexolu-pos-api) - version de solo lectura
// (ver los negocios + impersonar), sin los campos de las acciones de
// edicion (activar, extender trial, cambiar plan, etc.) que ese modulo
// tambien podria exponer pero que quedaron fuera de este primer corte.
export type SubscriptionStatus = 'inactive' | 'paid' | 'trial' | 'expired'

export interface SuperAdminBusiness {
  id: number
  name: string
  slug: string
  owner_name: string
  phone: string | null
  nit: string | null
  address: string | null
  active: boolean
  ai_chat_blocked: boolean
  trial_ends_at: string | null
  paid_until: string | null
  subscription_plan: string | null
  subscription_status: SubscriptionStatus
  days_remaining: number
  custom_price_cop: number | null
  users_count?: number
  products_count?: number
  sales_count?: number
  product_categories_count?: number
  admin_user: { id: number; name: string } | null
  last_activity_at: string | null
  created_at: string
}

export interface SuperAdminBusinessTeamMember {
  id: number
  name: string
  email: string
  is_active: boolean
  is_business_owner: boolean
  roles: string[]
  last_active_at: string | null
}

export interface SuperAdminBusinessSubscriptionPayment {
  id: number
  amount_cop: number
  period_label: string
  days_granted: number
  paid_at: string | null
  payment_method: string | null
  notes: string | null
  recorded_by: { id: number; name: string } | null
  created_at: string
}

export interface SuperAdminBusinessDetail {
  business: SuperAdminBusiness
  stats: {
    revenue_last_30_days: number
    closed_sales_last_30_days: number
    avg_ticket_last_30_days: number
    active_sellers_last_30_days: number
    open_sales_now: number
    last_sale_at: string | null
    open_support_tickets: number
  }
  team: SuperAdminBusinessTeamMember[]
  roles_summary: Array<{ role: string; total: number; active: number }>
  recent_subscription_payments: SuperAdminBusinessSubscriptionPayment[]
}
