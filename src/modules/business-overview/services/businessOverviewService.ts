import { httpClient } from '@/services/http/client'
import type { BusinessOverview } from '@/types/businessOverview'

export async function fetchBusinessOverview(year: number, month: number): Promise<BusinessOverview> {
  const { data } = await httpClient.get<BusinessOverview>('/reports/sales/business-overview', {
    params: { year, month },
  })
  return data
}
