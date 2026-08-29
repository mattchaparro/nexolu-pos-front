/**
 * Cobro con datáfono.
 *
 * Ojo con la confusión fácil: el medio de pago "Bold" del catálogo es una
 * ETIQUETA con la que el cajero registra un cobro que hizo a mano en el
 * aparato. Esto otro es la INTEGRACIÓN: el POS le dice al datáfono que
 * muestre el monto y espera. Solo existe si el negocio conectó Bold en
 * Ajustes → Medios de pago.
 */
export interface PaymentTerminal {
  id: number
  name: string
  serial: string
  model: string
  is_usable: boolean
}

export type TerminalChargeStatus =
  | 'pending'
  | 'approved'
  | 'consumed'
  | 'declined'
  | 'error'
  | 'voided'
  | 'expired'

export interface TerminalCharge {
  reference: string
  status: TerminalChargeStatus
  amount: number
  terminal: string | null
  failure_reason: string | null
  sale_id: number | null
  resolved_at: string | null
}
