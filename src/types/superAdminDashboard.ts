/** GET /superadmin/dashboard. */

export interface SuperAdminDashboardStats {
  total_businesses: number
  trial: number
  paid: number
  expired: number
  monthly_revenue_cop: number
  mrr_cop: number
  total_users: number
  new_businesses_last_30_days: number
  closed_sales_last_30_days: number
}

export interface DashboardBusinessRow {
  id: number
  name: string
  owner_name: string | null
  status: string
  days_remaining: number | null
}

export interface DashboardTopBusinessRow {
  id: number
  name: string
  sales_count: number
  products_count: number
  users_count: number
  status: string
}

export interface SuperAdminDashboardResponse {
  stats: SuperAdminDashboardStats
  expiring_businesses: DashboardBusinessRow[]
  top_businesses: DashboardTopBusinessRow[]
}
