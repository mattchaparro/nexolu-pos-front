import { computed, nextTick, ref } from 'vue'

/**
 * El recorrido guiado de la primera vez.
 *
 * Un editor con ocho secciones no se explica solo, y el comerciante promedio
 * no va a tocar botones "a ver qué pasa" en la pantalla que publica su tienda
 * a internet. El recorrido enseña dónde está cada cosa una vez, y se aparta.
 *
 * Tres decisiones que lo hacen usable y no molesto:
 *
 * 1. **Se puede saltar en cualquier paso**, y saltarlo cuenta como visto. Un
 *    tour que vuelve a aparecer porque no lo terminaste es un castigo.
 * 2. **Se recuerda por NEGOCIO, no por navegador a secas.** El dueño que
 *    administra dos negocios tiene que verlo en cada uno; y en un POS
 *    compartido, dos usuarios del mismo negocio no se lo pisan entre sí.
 * 3. **Se puede relanzar a mano.** Nadie retiene ocho pasos a la primera, y
 *    sin forma de repetirlo la única salida es adivinar.
 *
 * Cada paso apunta a un selector real de la pantalla: si el elemento no
 * existe (porque la sección no está montada), el paso se salta solo en vez
 * de dejar el globo flotando apuntando a nada.
 */
export interface TourStep {
  /** Elemento al que se ancla. Vacío = paso centrado, sin ancla. */
  target: string
  title: string
  body: string
  /** Sección del riel que hay que abrir para que el ancla exista. */
  section?: string
  placement?: 'right' | 'left' | 'bottom' | 'top'
}

export const EDITOR_TOUR: TourStep[] = [
  {
    target: '',
    title: 'Esta es tu tienda',
    body: 'En esta pantalla armas la página que van a ver tus clientes. Te muestro dónde está cada cosa — son 6 pasos y puedes salir cuando quieras.',
  },
  {
    target: '[data-tour="rail"]',
    title: 'Todo se edita desde acá',
    body: 'Cada ícono es una parte de tu tienda: lo que se ve, los colores, la letra, tus datos, el envío y cómo apareces en Google.',
    placement: 'right',
  },
  {
    target: '[data-tour="preview"]',
    title: 'Lo que ves es tu tienda de verdad',
    body: 'No es un dibujo aproximado: es tu tienda, actualizándose mientras editas. Toca cualquier parte para editar justo eso.',
    placement: 'left',
  },
  {
    target: '[data-tour="section-plantillas"]',
    title: 'Empieza por una plantilla',
    body: 'Es el camino más rápido: eliges una y tu tienda queda armada. Después cambias lo que quieras.',
    section: 'plantillas',
    placement: 'right',
  },
  {
    target: '[data-tour="checklist"]',
    title: 'Qué te falta para abrir',
    body: 'Acá ves lo que le falta a tu tienda. Toca cualquier punto pendiente y te llevo al lugar donde se arregla.',
    placement: 'left',
  },
  {
    target: '[data-tour="save"]',
    title: 'Nada se publica hasta que guardes',
    body: 'Puedes probar con confianza: mientras no toques Guardar, tus clientes siguen viendo la tienda como estaba.',
    placement: 'bottom',
  },
]

/** Una llave por negocio: el mismo dueño con dos negocios lo ve en cada uno. */
function storageKey(businessId: number | null): string {
  return `nexolu_editor_tour_seen_${businessId ?? 'anon'}`
}

export function useEditorTour(
  businessId: () => number | null,
  goToSection: (section: string) => void,
) {
  const stepIndex = ref(0)
  const running = ref(false)

  const step = computed<TourStep | null>(() =>
    running.value ? EDITOR_TOUR[stepIndex.value] : null,
  )
  const isLast = computed(() => stepIndex.value === EDITOR_TOUR.length - 1)
  const total = EDITOR_TOUR.length

  function seen(): boolean {
    try {
      return localStorage.getItem(storageKey(businessId())) === '1'
    } catch {
      // Modo privado o almacenamiento bloqueado: se prefiere no mostrarlo a
      // mostrarlo en bucle en cada carga.
      return true
    }
  }

  function markSeen(): void {
    try {
      localStorage.setItem(storageKey(businessId()), '1')
    } catch {
      // Sin dónde guardarlo, el recorrido simplemente se repetirá. No es
      // motivo para romper el editor.
    }
  }

  async function applyStep(): Promise<void> {
    const current = EDITOR_TOUR[stepIndex.value]
    if (current?.section) {
      goToSection(current.section)
      // El ancla del paso vive dentro de la sección que se acaba de abrir.
      await nextTick()
    }
  }

  async function start(force = false): Promise<void> {
    if (!force && seen()) {
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
