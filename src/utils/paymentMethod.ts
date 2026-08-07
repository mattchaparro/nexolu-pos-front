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
