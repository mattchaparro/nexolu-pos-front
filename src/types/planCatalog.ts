// Refleja tanto SuperAdmin\FeatureCatalogController::index (panel interno)
// como PlanCatalogController::index (endpoint publico que consume el wizard
// de registro) en nexolu-pos-api - misma forma de respuesta, ambos son
// espejos de solo lectura de App\Support\BusinessFeaturePresets::catalog(),
// unica fuente de verdad del mapeo plan -> funciones.
export interface FeatureCatalogEntry {
  key: string
  label: string
  description: string
  group: string
  basic: boolean
  full: boolean
}

export interface FeatureCatalogPlan {
  price_cop: number
}

export interface FeatureCatalogResponse {
  features: FeatureCatalogEntry[]
  plans: {
    basic: FeatureCatalogPlan
    full: FeatureCatalogPlan
  }
}
