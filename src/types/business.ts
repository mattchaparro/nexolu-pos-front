// Refleja BusinessResource (app/Http/Resources/Api/V1/BusinessResource.php)
// en nexolu-pos-api - mantener sincronizado si el endpoint cambia. Solo se
// tipan los campos que el frontend consume hasta ahora (header del
// Dashboard, configuracion que usa Vender, y el modulo de Ajustes).
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
  // Idem, pero para el feature flag 'services' (pestaña Servicios del hub
  // de Catalogo y el modulo de Ordenes de servicio) - ver BusinessResource.
  can_access_services: boolean
  // Agenda/citas - feature independiente de 'services' (ver BusinessResource).
  can_access_scheduling: boolean
  // Idem, para el feature flag 'layaway' (modulo Apartados).
  can_access_layaways: boolean
  // Configuracion del formulario de "Nueva orden de servicio" (modulo
  // Ajustes) - ver ServiceOrderFormView.vue.
  service_orders_show_catalog: boolean
  service_orders_default_service_name: string | null
}
