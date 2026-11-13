// Confirmación de una acción ("¿Eliminar este producto?") con el modal del
// proyecto, en vez del `window.confirm` del navegador: aquel muestra un
// cuadro gris con la dirección del sitio, no sigue el diseño y en algunas
// tablets queda detrás del teclado.
//
// Es una función y no un componente por pantalla: se usa igual que el
// confirm nativo, pero con await.
//
//   if (!(await confirmAction('¿Eliminar "Coronita"?'))) return
//
// El modal vive una sola vez en App.vue (ver src/ui/NxConfirmDialog.vue) y
// lee este estado. Para avisar que algo salió mal no se usa esto: va por
// useSystemAlert().notify(mensaje, 'error').
import { reactive } from 'vue'

export interface ConfirmOptions {
  message: string
  title?: string
  /** Texto del botón que confirma. Por defecto se saca de la pregunta. */
  confirmLabel?: string
  cancelLabel?: string
  /** Botón rojo: borrar, cancelar, desactivar. Por defecto se saca de la pregunta. */
  danger?: boolean
}

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger: boolean
}

export const confirmState = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: '',
  cancelLabel: '',
  danger: false,
})

let resolvePending: ((accepted: boolean) => void) | null = null

// Acciones que no se deshacen (o que le quitan algo al cliente): botón rojo
// y el verbo en el botón, para que no sea un "Aceptar" que se oprime sin leer.
const DESTRUCTIVE_VERBS = [
  'Eliminar',
  'Cancelar',
  'Desactivar',
  'Deshacer',
  'Despublicar',
  'Desconectar',
  'Anular',
  'Quitar',
]

function destructiveVerb(message: string): string | null {
  const firstWord = message.replace(/^[¿\s]+/, '').split(/[\s?]/)[0] ?? ''
  return DESTRUCTIVE_VERBS.find((verb) => verb.toLowerCase() === firstWord.toLowerCase()) ?? null
}

export function confirmAction(input: string | ConfirmOptions): Promise<boolean> {
  const options = typeof input === 'string' ? { message: input } : input
  const verb = destructiveVerb(options.message)

  // Si ya había una pregunta abierta, se da por rechazada: no pueden quedar
  // dos promesas esperando el mismo modal.
  resolvePending?.(false)

  confirmState.title = options.title ?? 'Confirma para continuar'
  confirmState.message = options.message
  confirmState.danger = options.danger ?? verb !== null
  confirmState.confirmLabel =
    options.confirmLabel ?? (verb ? `Sí, ${verb.toLowerCase()}` : 'Sí, continuar')
  // "Volver" y no "Cancelar": en "¿Cancelar esta cita?" un botón Cancelar
  // no dice cuál de las dos cosas hace.
  confirmState.cancelLabel = options.cancelLabel ?? 'Volver'
  confirmState.open = true

  return new Promise<boolean>((resolve) => {
    resolvePending = resolve
  })
}

/** Lo llama el modal al cerrarse, por cualquiera de sus botones o con Esc. */
export function settleConfirm(accepted: boolean): void {
  confirmState.open = false
  resolvePending?.(accepted)
  resolvePending = null
}
