// Espejo de solo-lectura de App\Support\BusinessFeaturePresets (nexolu-pos-api)
// - unico consumidor es la pestaña "Features" del detalle de Negocio en
// SuperAdmin (auditoria: "¿que tiene encendido este negocio?"), no decide
// nada por si solo. Mantener las claves/labels/defaults sincronizados si
// el catalogo del backend cambia.
export interface FeatureFlagInfo {
  key: string
  label: string
}

export const FEATURE_FLAGS: FeatureFlagInfo[] = [
  { key: 'inventory', label: 'Inventario básico' },
  { key: 'inventory_advanced', label: 'Inventario avanzado' },
  { key: 'ingredients', label: 'Ingredientes / recetas' },
  { key: 'open_tabs', label: 'Cuentas abiertas (mesas)' },
  { key: 'kitchen_board', label: 'Comandera de cocina' },
  { key: 'services', label: 'Servicios' },
  { key: 'scheduling', label: 'Agenda' },
  { key: 'layaway', label: 'Apartados' },
  { key: 'receivables', label: 'Fiados' },
  { key: 'clients', label: 'Directorio de clientes' },
  { key: 'discounts', label: 'Descuentos' },
  { key: 'charges', label: 'Cargos (servicio / impoconsumo)' },
  { key: 'expenses', label: 'Gastos' },
  { key: 'managerial_accounting', label: 'Contabilidad gerencial' },
  { key: 'cash_closing', label: 'Cierre de caja' },
  { key: 'cash_receipts_pdf', label: 'Recibos en PDF' },
  { key: 'low_stock_alert', label: 'Alertas de inventario bajo' },
  { key: 'permissions_management', label: 'Gestión de permisos de empleados' },
  { key: 'audit_logs', label: 'Auditoría' },
  { key: 'reminders', label: 'Recordatorios' },
]

const PLAN_DEFAULTS: Record<string, Record<string, boolean>> = {
  basic: {
    open_tabs: false,
    inventory: true,
    inventory_advanced: false,
    ingredients: false,
    expenses: true,
    managerial_accounting: false,
    cash_closing: true,
    receivables: true,
    kitchen_board: false,
    services: false,
    cash_receipts_pdf: false,
    permissions_management: false,
    low_stock_alert: false,
    audit_logs: false,
    clients: false,
    scheduling: false,
    layaway: false,
    discounts: false,
    charges: false,
    reminders: true,
  },
  full: {
    open_tabs: true,
    inventory: true,
    inventory_advanced: true,
    ingredients: true,
    expenses: true,
    managerial_accounting: true,
    cash_closing: true,
    receivables: true,
    kitchen_board: true,
    services: true,
    cash_receipts_pdf: true,
    permissions_management: true,
    low_stock_alert: true,
    audit_logs: true,
    clients: true,
    scheduling: true,
    layaway: false,
    discounts: false,
    charges: false,
    reminders: true,
  },
}

/**
 * Mismo criterio de 3 ramas que Business::hasFeature() en el backend:
 * flags null/vacio = todo habilitado (negocios viejos sin JSON), clave
 * presente = su valor, clave ausente con plan conocido = default del plan,
 * si no, apagado.
 */
export function resolveFeatureFlag(
  flags: Record<string, boolean> | null,
  plan: string | null,
  key: string,
): boolean {
  if (!flags || Object.keys(flags).length === 0) {
    return true
  }
  if (key in flags) {
    return flags[key]
  }
  if (plan && PLAN_DEFAULTS[plan] && key in PLAN_DEFAULTS[plan]) {
    return PLAN_DEFAULTS[plan][key]
  }
  return false
}
