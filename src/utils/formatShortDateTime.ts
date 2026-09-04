/**
 * Fecha+hora compacta para listados ("3 sep, 7:41 p. m."), en es-CO. Para
 * fechas-solo-dia usar toLocalDateIso; esto es para momentos puntuales como
 * un abono registrado.
 */
export function formatShortDateTime(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return `${date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`
}
