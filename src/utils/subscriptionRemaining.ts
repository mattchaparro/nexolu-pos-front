/**
 * Cómo se muestra "cuánto le queda de suscripción" a un negocio.
 *
 * Vive suelto y no dentro de una vista porque lo usan el tablero de
 * plataforma y el listado de negocios: con dos copias, los umbrales de
 * urgencia se desincronizan y el mismo negocio sale en rojo en una pantalla
 * y en gris en la otra.
 *
 * `days_remaining` viene de Business::daysRemaining() en el backend, que
 * devuelve 0 —nunca negativo— cuando ya venció o no hay periodo vigente.
 */
export function remainingLabel(days: number | null, status?: string): string {
  // Un negocio desactivado puede tener dias pagos por delante: decir
  // "Vencido" seria falso, y decir "23 dias" haria pensar que esta operando.
  if (status === 'inactive') {
    return 'Desactivado'
  }
  if (status === 'expired') {
    return 'Vencido'
  }
  if (days === null) {
    return '—'
  }
  if (days === 0) {
    return 'Vence hoy'
  }
  return days === 1 ? '1 día' : `${days} días`
}

/**
 * Rojo solo cuando ya no hay margen para reaccionar. Pintar de rojo algo que
 * vence en 6 días hace que el color deje de significar urgencia.
 */
export function remainingClass(days: number | null, status?: string): string {
  if (status === 'expired' || status === 'inactive') {
    return 'text-red-600 font-semibold'
  }
  if (days === null) {
    return 'text-slate-400'
  }
  if (days <= 1) {
    return 'text-red-600 font-semibold'
  }
  if (days <= 3) {
    return 'text-amber-600 font-semibold'
  }
  if (days <= 7) {
    return 'text-amber-700'
  }
  return 'text-slate-600'
}
