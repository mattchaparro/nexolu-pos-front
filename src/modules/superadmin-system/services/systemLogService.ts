import { httpClient } from '@/services/http/client'
import type { SystemLogsResponse } from '@/types/systemLog'

export interface FetchSystemLogsParams {
  tab?: 'errors' | 'logs'
  level?: string
  search?: string
  date?: string
  page?: number
}

export async function fetchSystemLogs(params: FetchSystemLogsParams = {}): Promise<SystemLogsResponse> {
  const { data } = await httpClient.get<SystemLogsResponse>('/superadmin/system/logs', { params })
  return data
}
