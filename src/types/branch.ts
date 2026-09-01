/** Una sede (sucursal) del negocio. Ver App\Models\Branch en nexolu-pos-api. */
export interface Branch {
  id: number
  name: string
  code: string | null
  is_main: boolean
  is_active: boolean
  address: string | null
  phone: string | null
  whatsapp_number: string | null
  /** Ya resuelto por el backend: si la sede no lo personalizo, viene el del negocio. */
  invoice_prefix: string
}

export interface BranchesResponse {
  data: Branch[]
  /** Sede con la que el backend esta respondiendo ahora mismo. */
  current_branch_id: number | null
  /** true cuando se pidio el consolidado (X-Branch-Id: all). */
  all_branches: boolean
  /** Si este usuario puede pedir el consolidado. El front no debe ofrecerlo si no. */
  can_view_all_branches: boolean
}

export interface BranchPayload {
  name: string
  code?: string | null
  address?: string | null
  phone?: string | null
  whatsapp_number?: string | null
  invoice_prefix?: string | null
  ticket_paper_width?: string | null
  ticket_header_tagline?: string | null
  ticket_thanks_message?: string | null
  ticket_footer_text?: string | null
  is_active?: boolean
  is_main?: boolean
}

/** Una fila del comparativo entre sedes (GET /reports/branches). */
export interface BranchComparisonRow {
  branch_id: number
  name: string
  is_main: boolean
  sales_count: number
  revenue: number
  avg_ticket: number
  expenses: number
  net: number
  /** Cuanto del ingreso del negocio aporta esta sede. null si no hubo ingreso. */
  revenue_share_pct: number | null
}

export interface BranchComparison {
  from: string
  to: string
  branches: BranchComparisonRow[]
  totals: {
    sales_count: number
    revenue: number
    expenses: number
    net: number
  }
}
