import { httpClient } from '@/services/http/client'
import type { FeatureCatalogResponse } from '@/types/planCatalog'

// Publico (PlanCatalogController) - sin auth, lo usa el wizard de registro
// antes de que exista una sesion.
export async function fetchPlanCatalog(): Promise<FeatureCatalogResponse> {
  const { data } = await httpClient.get<FeatureCatalogResponse>('/plans')
  return data
}
