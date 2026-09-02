import { httpClient } from '@/services/http/client'
import type { SuperAdminAuditLogEntry } from '@/types/auditLog'
import type { PaginatedResponse } from '@/types/pagination'

export interface FetchSuperAdminAuditLogsParams {
  search?: string
  /** Codigo exacto de accion (el desplegable), distinto de `search` por texto libre. */
  action?: string
  business_id?: number
  page?: number
}

export async function fetchSuperAdminAuditLogs(
  params: FetchSuperAdminAuditLogsParams = {},
): Promise<PaginatedResponse<SuperAdminAuditLogEntry>> {
  const { data } = await httpClient.get<PaginatedResponse<SuperAdminAuditLogEntry>>('/superadmin/audit-logs', { params })
  return data
}

/** Diccionario {codigo: texto} completo, para el filtro por tipo de accion. */
export async function fetchSuperAdminAuditActions(): Promise<Record<string, string>> {
  const { data } = await httpClient.get<Record<string, string>>('/superadmin/audit-logs/actions')
  return data
}

// responseType 'blob': el endpoint esta detras de auth:sanctum, asi que no se
// puede enlazar directo (mismo motivo que en el modulo de auditoria del negocio).
export async function fetchSuperAdminAuditLogsCsv(
  params: FetchSuperAdminAuditLogsParams,
): Promise<Blob> {
  const { data } = await httpClient.get('/superadmin/audit-logs/export', { params, responseType: 'blob' })
  return data
}
