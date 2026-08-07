// Espejo de Business::isCreditPaymentMethod() en nexolu-pos-api: el fiado
// puede identificarse con cualquiera de estos labels segun como el negocio
// haya configurado sus medios de pago.
const CREDIT_METHOD_IDS = ['credit', 'fiado', 'credito', 'crédito']

export function isCreditPaymentMethodId(id: string | null | undefined): boolean {
  if (!id) {
    return false
  }
  return CREDIT_METHOD_IDS.includes(id.toLowerCase())
}

// Espejo de Business::resolveCashPaymentMethodId() en nexolu-pos-api: solo
// estos dos representan pago en efectivo (habilita el calculo de vuelto).
const CASH_METHOD_IDS = ['cash', 'efectivo']

export function isCashPaymentMethodId(id: string | null | undefined): boolean {
  if (!id) {
    return false
  }
  return CASH_METHOD_IDS.includes(id.toLowerCase())
}
