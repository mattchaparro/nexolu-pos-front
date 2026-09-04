import { computed, nextTick, ref } from 'vue'

import type { TourStep } from '@/types/tour'

/**
 * Recorrido guiado de la primera vez, reutilizable por cualquier pantalla.
 *
 * Nació dentro del editor de la tienda (un editor con ocho secciones no se
 * explica solo, y el comerciante promedio no toca botones "a ver qué pasa" en
 * la pantalla que publica su tienda a internet). Se extrajo al necesitarlo el
 * segundo módulo: es exactamente el camino por el que, si no, terminan dos
 * copias que se desincronizan.
 *
 * Tres decisiones que lo hacen usable y no molesto, heredadas del original:
 *
 * 1. **Se puede saltar en cualquier paso**, y saltarlo cuenta como visto. Un
 *    recorrido que vuelve a aparecer porque no lo terminaste es un castigo.
 * 2. **Se recuerda por NEGOCIO y por recorrido**, no por navegador a secas. El
 *    dueño con dos negocios lo ve en cada uno; y haber visto el de la tienda
 *    no debe saltarse el del catálogo.
 * 3. **Se puede relanzar a mano.** Nadie retiene ocho pasos a la primera, y sin
 *    forma de repetirlo la única salida es adivinar.
 *
 * Cada paso apunta a un selector real: si el elemento no existe (la sección no
 * está montada), el globo se muestra centrado en vez de quedar apuntando al
 * vacío.
 */
export function useGuidedTour(
  tourKey: string,
  steps: TourStep[],
  businessId: () => number | null,
  /** Prepara la pantalla para el paso (abrir una sección, cambiar de pestaña). */
  prepare?: (section: string) => void,
) {
  const stepIndex = ref(0)
  const running = ref(false)

  const step = computed<TourStep | null>(() =>
    running.value ? (steps[stepIndex.value] ?? null) : null,
  )
  const isLast = computed(() => stepIndex.value === steps.length - 1)
  const total = steps.length

  // La llave lleva el recorrido Y el negocio: sin el recorrido, ver el de la
  // tienda marcaria como visto el del catalogo.
  function storageKey(): string {
    return `nexolu_tour_${tourKey}_seen_${businessId() ?? 'anon'}`
  }

  function seen(): boolean {
    try {
      return localStorage.getItem(storageKey()) === '1'
    } catch {
      // Modo privado o almacenamiento bloqueado: se prefiere no mostrarlo a
      // mostrarlo en bucle en cada carga.
      return true
    }
  }

  function markSeen(): void {
    try {
      localStorage.setItem(storageKey(), '1')
    } catch {
      // Sin dónde guardarlo, el recorrido simplemente se repetirá. No es
      // motivo para romper la pantalla.
    }
  }

  async function applyStep(): Promise<void> {
    const current = steps[stepIndex.value]
    if (current?.section && prepare) {
      prepare(current.section)
      // El ancla del paso vive dentro de la sección que se acaba de abrir.
      await nextTick()
    }
  }

  async function start(force = false): Promise<void> {
    if (steps.length === 0 || (!force && seen())) {
      return
    }
    stepIndex.value = 0
    running.value = true
    await applyStep()
  }

  async function next(): Promise<void> {
    if (isLast.value) {
      finish()
      return
    }
    stepIndex.value += 1
    await applyStep()
  }

  async function back(): Promise<void> {
    if (stepIndex.value === 0) {
      return
    }
    stepIndex.value -= 1
    await applyStep()
  }

  /** Saltar cuenta como visto: repetirlo sería un castigo por salirse. */
  function finish(): void {
    running.value = false
    markSeen()
  }

  return { step, stepIndex, total, isLast, running, start, next, back, finish }
}
