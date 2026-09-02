// Refleja LogActionResource (app/Http/Resources/Api/V1/LogActionResource.php)
// en nexolu-pos-api.
export interface AuditLogEntry {
  id: number
  action: string
  action_label: string
  user: { id: number; name: string; email: string } | null
  details: Record<string, unknown> | null
  ip: string | null
  url: string | null
  method: string | null
  created_at: string
}

/**
 * Fila de la auditoria GLOBAL del SuperAdmin
 * (App\Http\Resources\Api\V1\SuperAdmin\LogActionResource).
 *
 * Se diferencia de AuditLogEntry en que trae el negocio y la marca de
 * impersonacion: la auditoria del propio negocio filtra las acciones que
 * hizo soporte en su nombre (ver AuditLogQuery::forBusiness), pero desde el
 * panel de plataforma son justo las que hay que poder distinguir.
 */
export interface SuperAdminAuditLogEntry extends AuditLogEntry {
  business_id: number | null
  business: { id: number; name: string } | null
  impersonated_by_superadmin_id: number | null
}
