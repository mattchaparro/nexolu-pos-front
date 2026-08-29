/**
 * La pasarela propia del negocio (Wompi o Bold), con la que le cobra a sus
 * compradores. Distinta de la de Nexolú, con la que le cobramos a él.
 *
 * Los secretos nunca viajan: la API no los devuelve ni siquiera al dueño.
 * `credential_fields` dice qué pide cada proveedor para que el formulario
 * no tenga los nombres escritos a mano.
 */
export interface PaymentGatewayProvider {
  provider_slug: 'wompi' | 'bold'
  credential_fields: string[]
  is_connected: boolean
  is_active: boolean
  environment: string | null
  connected_at: string | null
  /** Por qué falló el último intento de conectar. */
  last_error: string | null
}
