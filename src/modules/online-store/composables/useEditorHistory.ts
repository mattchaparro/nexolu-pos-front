import { computed, ref, type Ref } from 'vue'

/**
 * Deshacer/rehacer de los cambios SIN GUARDAR del editor de la tienda.
 *
 * Vive acá y no en el paquete `block-editor` porque el historial cubre todo
 * el borrador (bloques, colores, tipografía), no solo la lista de bloques:
 * deshacer un cambio de color y no poder deshacer uno de bloque sería peor
 * que no tener deshacer.
 *
 * Se guarda el borrador COMPLETO en cada paso, no un diff. Con un tope de 30
 * estados y un borrador que son unos pocos kB de JSON, la memoria es
 * irrelevante y evita toda la complejidad de invertir operaciones.
 *
 * Igual que en Shopify, el historial es de lo no guardado: al guardar se
 * limpia. Un "deshacer" que revierte algo ya publicado es una trampa.
 */
const MAX_STEPS = 30

export function useEditorHistory<T>(snapshot: () => T, restore: (state: T) => void) {
  const past = ref<string[]>([])
  const future = ref<string[]>([])

  /**
   * Mientras se restaura, el watch del borrador se dispara igual. Sin esta
   * bandera, deshacer grabaría el estado restaurado como un paso nuevo y el
   * historial nunca avanzaría hacia atrás.
   */
  const restoring = ref(false)

  /** Lo último que se registró, para no grabar pasos que no cambian nada. */
  let last = JSON.stringify(snapshot())

  function record(): void {
    if (restoring.value) {
      return
    }

    const current = JSON.stringify(snapshot())
    if (current === last) {
      return
    }

    past.value = [...past.value, last].slice(-MAX_STEPS)
    // Cualquier cambio nuevo invalida lo que se habia deshecho: es una rama
    // que ya no existe.
    future.value = []
    last = current
  }

  function apply(state: string): void {
    restoring.value = true
    restore(JSON.parse(state) as T)
    last = state
    // Se libera en el siguiente tick para que el watch del borrador (que
    // corre despues de la restauracion) vea la bandera todavia arriba.
    void Promise.resolve().then(() => {
      restoring.value = false
    })
  }

  function undo(): void {
    const previous = past.value.at(-1)
    if (previous === undefined) {
      return
    }

    future.value = [JSON.stringify(snapshot()), ...future.value]
    past.value = past.value.slice(0, -1)
    apply(previous)
  }

  function redo(): void {
    const next = future.value[0]
    if (next === undefined) {
      return
    }

    past.value = [...past.value, JSON.stringify(snapshot())]
    future.value = future.value.slice(1)
    apply(next)
  }

  /** Al guardar: lo publicado pasa a ser el punto de partida. */
  function reset(): void {
    past.value = []
    future.value = []
    last = JSON.stringify(snapshot())
  }

  return {
    record,
    undo,
    redo,
    reset,
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
  }
}

/**
 * Atajos de teclado. En un editor a pantalla completa, Ctrl+Z es lo primero
 * que la gente intenta.
 */
export function useUndoShortcuts(
  enabled: Ref<boolean>,
  undo: () => void,
  redo: () => void,
): () => void {
  function onKeydown(event: KeyboardEvent): void {
    if (!enabled.value || !(event.ctrlKey || event.metaKey)) {
      return
    }

    const key = event.key.toLowerCase()
    if (key !== 'z' && key !== 'y') {
      return
    }

    // No secuestrar el deshacer nativo mientras se escribe en un campo: ahí
    // Ctrl+Z tiene que deshacer LETRAS, no bloques.
    const target = event.target as HTMLElement | null
    const tag = target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
      return
    }

    event.preventDefault()
    if (key === 'y' || event.shiftKey) {
      redo()
    } else {
      undo()
    }
  }

  window.addEventListener('keydown', onKeydown)

  return () => window.removeEventListener('keydown', onKeydown)
}
