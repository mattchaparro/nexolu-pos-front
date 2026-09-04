import { httpClient } from '@/services/http/client'
import type { PlatformFinanceResponse } from '@/types/platformFinance'

export async function fetchPlatformFinance(year: number, month: number): Promise<PlatformFinanceResponse> {
  const { data } = await httpClient.get<PlatformFinanceResponse>('/superadmin/finance', {
    params: { year, month },
  })
  return data
}
