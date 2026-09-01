/**
 * La pasarela propia del negocio (Wompi o Bold), con la que le cobra a sus
 * compradores. Distinta de la de Nexolú, con la que le cobramos a él.
 *
 * Los secretos nunca viajan: la API no los devuelve ni siquiera al dueño.
 *
 * `capabilities` agrupa las llaves por lo que HABILITAN, no por proveedor.
 * Bold emite dos juegos distintos y no intercambiables — uno para cobrar por
 * internet y otro para el datáfono — y un negocio puede tener uno, el otro o
 * los dos. Solo llegan las capacidades que ese negocio puede usar: sin tienda
 * online, el botón de pagos ni siquiera se ofrece.
 */
export type PaymentCapability = 'online' | 'terminal'

export interface PaymentGatewayProvider {
  provider_slug: 'wompi' | 'bold'
  capabilities: Partial<Record<PaymentCapability, string[]>>
  is_connected: boolean
  is_active: boolean
  environment: string | null
  connected_at: string | null
  /** Por qué falló el último intento de conectar. */
  last_error: string | null
}
