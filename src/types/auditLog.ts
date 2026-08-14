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
