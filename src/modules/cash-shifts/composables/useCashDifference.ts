import { computed, type Ref } from 'vue'

import { formatCop } from '@/utils/formatCop'

export type CashDifferenceTone = 'ok' | 'over' | 'short'

/**
 * Traduce la diferencia de un arqueo (contado - esperado) a lenguaje llano
 * en vez de solo un numero, con una pista de troubleshooting - lo que los
 * dueños de negocio pidieron: no siempre es obvio de donde sale que sobre o
 * falte plata en caja.
 */
export function useCashDifference(counted: Ref<number | null>, expected: Ref<number>) {
  const difference = computed(() => (counted.value === null ? null : counted.value - expected.value))

  const tone = computed<CashDifferenceTone | null>(() => {
    if (difference.value === null) {
      return null
    }
    if (Math.abs(difference.value) < 1) {
      return 'ok'
    }
    return difference.value > 0 ? 'over' : 'short'
  })

  const message = computed(() => {
    if (difference.value === null || tone.value === null) {
      return null
    }
    if (tone.value === 'ok') {
      return 'La caja cuadra.'
    }
    if (tone.value === 'over') {
      return `Sobran ${formatCop(difference.value)}. Revisa si olvidaste registrar un cobro o un vuelto entregado de más.`
    }
    return `Faltan ${formatCop(Math.abs(difference.value))}. Revisa si olvidaste registrar un gasto, un vuelto entregado de más, o un cobro que no quedó en el sistema.`
  })

  return { difference, tone, message }
}
