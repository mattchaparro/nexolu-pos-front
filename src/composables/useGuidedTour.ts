import { computed, nextTick, onUnmounted, ref, shallowRef } from 'vue'

import type { TourStep } from '@/types/tour'

/**
 * Recorrido guiado de la primera vez, reutilizable por cualquier pantalla.
 *
 * Nació dentro del editor de la tienda (un editor con ocho secciones no se
 * explica solo, y el comerciante promedio no toca botones "a ver qué pasa" en
 * la pantalla que publica su tienda a internet). Se extrajo al necesitarlo el
 * segundo módulo: es exactamente el camino por el que, si no, terminan varias
 * copias que se desincronizan.
 *
 * Se recuerda por NEGOCIO y por recorrido: el dueño con dos negocios lo ve en
 * cada uno, y haber visto el de la tienda no debe saltarse el del catálogo.
 *
 * Cada paso apunta a un selector real: si el elemento no existe (la sección no
 * está montada), el globo se muestra centrado en vez de quedar apuntando al
 * vacío.
 */
export interface TourController {
  start: (force?: boolean) => Promise<void>
  running: ReturnType<typeof ref<boolean>>
}

/**
 * El recorrido de la pantalla que está montada ahora mismo, si tiene uno.
 *
 * Vive a nivel de módulo para que la barra superior pueda ofrecer el signo de
 * pregunta sin saber nada de cada módulo, y para que NO aparezca donde no hay
 * recorrido: si nadie se registró, el botón no se dibuja. Antes cada pantalla
 * ponía su propio botón, que es como terminan tres botones distintos en tres
 * lugares distintos.
 */
const activeTour = shallowRef<TourController | null>(null)

export function useActiveTour() {
  return activeTour
}

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
    return `nexolu_tour_${tourKey}_dismissed_${businessId() ?? 'anon'}`
  }

  function dismissed(): boolean {
    try {
      return localStorage.getItem(storageKey()) === '1'
    } catch {
      // Modo privado o almacenamiento bloqueado: se prefiere no mostrarlo a
      // mostrarlo en bucle en cada carga.
      return true
    }
  }

  function markDismissed(): void {
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
    if (steps.length === 0 || (!force && dismissed())) {
      return
    }
    stepIndex.value = 0
    running.value = true
    await applyStep()
  }

  async function next(): Promise<void> {
    if (isLast.value) {
      dismiss()
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

  /**
   * Lo cierra para siempre. Son las dos salidas deliberadas: "Omitir" y
   * "Entendido" del último paso. Llegar al final es una señal aún más fuerte
   * que omitirlo, así que también cuenta.
   */
  function dismiss(): void {
    running.value = false
    markDismissed()
  }

  /**
   * Lo cierra SOLO por ahora: vuelve la próxima vez que entre a la pantalla.
   *
   * Es lo que pasa al tocar fuera del globo. Antes eso lo marcaba como visto,
   * así que un clic al aire de alguien que ni lo leyó lo hacía desaparecer
   * para siempre.
   */
  function close(): void {
    running.value = false
  }

  activeTour.value = { start, running }
  onUnmounted(() => {
    if (activeTour.value?.start === start) {
      activeTour.value = null
    }
  })

  return { step, stepIndex, total, isLast, running, start, next, back, dismiss, close }
}
