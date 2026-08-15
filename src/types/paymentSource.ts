// Refleja BusinessPaymentSourceController / PaymentMethodsController
// (nexolu-pos-api) - "Fuentes de Pago" de Wompi via Nexolu Payments Core.
// Ver docs/PLAN_METODOS_PAGO_ALTERNOS.md (repo nexolu-pos-api) seccion 9.
export type PaymentSourceType = 'CARD' | 'NEQUI'

export interface PaymentSource {
  id: number
  payment_source_id: string
  type: PaymentSourceType
  label: string
  created_at: string
}

export interface PaymentMethodsCatalog {
  provider: string
  // Interseccion entre lo que el comercio de Wompi tiene habilitado y lo
  // que el Core sabe orquestar - solo pueden aparecer estos 4.
  accepted_payment_methods: ('CARD' | 'NEQUI' | 'PSE' | 'BANCOLOMBIA_TRANSFER')[]
}

export interface PseFinancialInstitution {
  code: string
  name: string
}

export interface ChargeCheckoutResult {
  transaction_id: string
  reference: string
  status: string
  provider_transaction_id: string
  provider_status: string
  // Solo poblado para PSE/BANCOLOMBIA_TRANSFER - a donde redirigir al
  // usuario para que termine el pago en el sitio de su banco.
  redirect_url: string | null
}
