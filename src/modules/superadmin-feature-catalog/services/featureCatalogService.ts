import { httpClient } from '@/services/http/client'
import type { FeatureCatalogResponse } from '@/types/planCatalog'

export async function fetchFeatureCatalog(): Promise<FeatureCatalogResponse> {
  const { data } = await httpClient.get<FeatureCatalogResponse>('/superadmin/feature-catalog')
  return data
}
