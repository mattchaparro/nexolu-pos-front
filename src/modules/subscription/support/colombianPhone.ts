// Celular colombiano: 10 digitos, empieza en 3 (ver ChargeSubscriptionCheckoutRequest
// del backend, regla /^3\d{9}$/ para Nequi - PSE usa el mismo formato para
// customer_phone_number). Compartido por AddNequiModal y PseModal.
export function stripToDigits(raw: string, maxLength = 10): string {
  return raw.replace(/\D/g, '').slice(0, maxLength)
}

/** "3107654321" -> "310 765 4321" - solo para mostrar, el valor guardado sigue siendo puros digitos. */
export function formatColombianPhone(digits: string): string {
  return digits.replace(/(\d{3})(\d{1,3})?(\d{1,4})?/, (_match, a, b, c) => [a, b, c].filter(Boolean).join(' '))
}

export function isValidColombianMobile(digits: string): boolean {
  return /^3\d{9}$/.test(digits)
}
