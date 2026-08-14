import { httpClient } from '@/services/http/client'
import type { AuditLogEntry } from '@/types/auditLog'
import type { PaginatedResponse } from '@/types/pagination'

export interface FetchAuditLogsParams {
  search?: string
  page?: number
}

export async function fetchAuditLogs(params: FetchAuditLogsParams = {}): Promise<PaginatedResponse<AuditLogEntry>> {
  const { data } = await httpClient.get<PaginatedResponse<AuditLogEntry>>('/audit-logs', { params })
  return data
}

// Diccionario {codigo: texto} completo (ver AuditActionDictionary::all() en
// el backend) - se usa para el filtro por tipo de accion.
export async function fetchAuditActions(): Promise<Record<string, string>> {
  const { data } = await httpClient.get<Record<string, string>>('/audit-logs/actions')
  return data
}

// responseType 'blob': mismo motivo que services/receipts.ts - el endpoint
// esta detras de auth:sanctum, asi que no se puede enlazar directo.
export async function fetchAuditLogsCsv(search?: string): Promise<Blob> {
  const { data } = await httpClient.get('/audit-logs/export', { params: { search }, responseType: 'blob' })
  return data
}
