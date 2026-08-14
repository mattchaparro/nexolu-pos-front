import { httpClient } from '@/services/http/client'
import type { DailySummary } from '@/types/dailySummary'

export async function fetchDailySummary(dateFrom: string, dateTo: string): Promise<DailySummary> {
  const { data } = await httpClient.get<DailySummary>('/reports/sales/daily', {
    params: { date_from: dateFrom, date_to: dateTo },
  })
  return data
}
