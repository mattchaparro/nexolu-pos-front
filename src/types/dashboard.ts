// Refleja DashboardService::todaySummary() (app/Services/DashboardService.php)
// en nexolu-pos-api - mantener sincronizado si el endpoint cambia.
export interface DashboardSummary {
  today_sales: number
  today_count: number
  today_cash: number
  today_transfer: number
  open_tabs_total: number
  receivables_enabled: boolean
  pending_receivables: number
  expenses_enabled: boolean
  today_expenses: number
  // null = el usuario todavia no personalizo sus atajos - ver
  // getDefaultShortcuts() en modules/dashboard/support/shortcuts.ts.
  shortcuts: DashboardShortcut[] | null
}

// route_name resuelve contra useNavItems() (no contra un menu separado, a
// diferencia del legacy con admin.json) - un atajo cuya ruta ya no existe o
// dejo de estar disponible para el usuario se descarta en vez de romper el
// grid, ver resolveShortcuts().
export interface DashboardShortcut {
  route_name: string
  // Acotado a la paleta de marca (indigo/neutro) a proposito - el legacy
  // dejaba elegir entre 11 colores arbitrarios, lo que violaba el sistema
  // de color de este frontend (ver "Sistema de color" en CLAUDE.md).
  color: 'primary' | 'outline'
}

// Refleja DashboardService::whatsappOnboarding() - null significa que el
// card no debe mostrarse (usuario sin acceso al Asistente, negocio
// bloqueado, o ya lo cerro).
export interface WhatsappOnboarding {
  linked: boolean
}
