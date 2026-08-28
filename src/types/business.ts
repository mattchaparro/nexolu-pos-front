// Refleja BusinessResource (app/Http/Resources/Api/V1/BusinessResource.php)
// en nexolu-pos-api - mantener sincronizado si el endpoint cambia. Solo se
// tipan los campos que el frontend consume hasta ahora (header del
// Dashboard, configuracion que usa Vender, y el modulo de Ajustes).
export interface BusinessPaymentMethod {
  id: string
  label: string
}

// Refleja la respuesta de GET/PUT /business/payment-methods
// (PosPaymentMethodController::buildResponse() en el backend) - selector de
// Ajustes > Ventas contra el catalogo global (App\Models\PosPaymentMethod),
// ya no texto libre. `migrated` distingue si el negocio ya tiene filas en
// business_pos_payment_methods (catalogo) o todavia lee del JSON legacy
// (payment_methods, expuesto aca solo como referencia mientras no migra).
export interface BusinessPosPaymentMethod {
  id: number
  key: string
  label: string
  is_active: boolean
  is_enabled: boolean
}

export interface BusinessPosPaymentMethodsResponse {
  data: BusinessPosPaymentMethod[]
  migrated: boolean
  legacy_payment_methods: BusinessPaymentMethod[]
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
  owner_name: string
  phone: string | null
  whatsapp_number: string | null
  instagram_handle: string | null
  tiktok_handle: string | null
  nit: string | null
  address: string | null
  logo_path: string | null
  ticket_paper_width: '58' | '80'
  invoice_prefix: string
  ticket_header_tagline: string | null
  ticket_thanks_message: string | null
  ticket_footer_text: string | null
  delivery_enabled: boolean
  delivery_fee: number
  // Solo los HABILITADOS - para selectores de una transaccion NUEVA
  // (checkout, abono a compra/apartado). Un medio que el negocio ya
  // desactivo no debe ofrecerse ahi.
  payment_methods: BusinessPaymentMethod[]
  // id => label de TODOS los medios configurados (habilitados o no) - para
  // resolver el label de un pago YA REGISTRADO que pudo usar un medio hoy
  // desactivado (ver PaymentModal.vue, abonos parciales). No usar para
  // poblar un selector, ver payment_methods arriba.
  payment_method_labels: Record<string, string>
  charges: BusinessChargesConfig
  low_stock_alert_threshold: number
  low_stock_email_enabled: boolean
  low_stock_email: string | null
  low_stock_snoozed_until: string | null
  // null = todas las categorias habilitan Apartados; array = solo esas.
  layaway_allowed_category_ids: number[] | null
  email_header_color: string | null
  email_footer_text: string | null
  email_whatsapp_cta: boolean
  notification_preferences: Record<string, boolean> | null
  // A diferencia de notification_preferences, el backend siempre lo manda
  // ya resuelto con los defaults de la plataforma aplicados (ver
  // BusinessResource) - nunca null ni con claves faltantes.
  notification_schedule: Record<string, string>
  feature_flags: Record<string, boolean> | null
  // Las 20 banderas del catalogo YA resueltas (Business::resolvedFeatures())
  // - lo que hasFeature() lee, en vez de replicar la logica de resolucion
  // de feature_flags/plan aca (ver BusinessResource y el comentario en
  // utils/hasFeature.ts).
  resolved_features: Record<string, boolean>
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
