// Refleja BusinessResource (app/Http/Resources/Api/V1/BusinessResource.php)
// en nexolu-pos-api - mantener sincronizado si el endpoint cambia. Solo se
// tipan los campos que el frontend consume hasta ahora (header del
// Dashboard + configuracion que usa Vender); se amplia cuando exista el
// modulo de Ajustes/Mi negocio.
export interface BusinessPaymentMethod {
  id: string
  label: string
}

export interface BusinessChargesConfig {
  service_charge_enabled: boolean
  service_charge_rate: number
  ipoconsumo_enabled: boolean
  ipoconsumo_rate: number
}

export interface Business {
  id: number
  name: string
  delivery_enabled: boolean
  delivery_fee: number
  payment_methods: BusinessPaymentMethod[]
  charges: BusinessChargesConfig
  feature_flags: Record<string, boolean> | null
  // Computado en el backend (Business::canAccessPurchases()) - no replicar
  // la logica de feature_flags/plan aca, ver BusinessResource.
  can_access_purchases: boolean
}
