// Alerta de acciones del sistema (ver src/ui/NxToast.vue, montado una vez
// en App.vue): mensajes cortos y no bloqueantes que confirman algo que
// acaba de pasar ("Producto agregado a la venta"). No reemplaza los errores
// de formulario (prop `error` de NxInput/NxInputNumber/NxSelect).
//
// Para errores de una ACCION (no de un campo) si es el canal principal: el
// banner de submitError vive arriba de la pantalla y el cajero esta mirando
// el panel de la cuenta - o la hoja movil, que lo tapa entero. Un "no hay
// stock" invisible se siente como que el boton no hace nada (reportado en
// produccion). Las vistas pueden seguir mostrando el banner ademas, para
// que el detalle quede a la vista despues de que el toast se va.
import { useToast } from 'primevue/usetoast'

export type SystemAlertSeverity = 'success' | 'info' | 'warn' | 'error'

/**
 * Un error hay que LEERLO ("No hay stock suficiente para «Coronita»
 * (disponible: 3)"), a diferencia de un "listo" que se entiende de reojo.
 */
const LIFE_BY_SEVERITY: Record<SystemAlertSeverity, number> = {
  success: 2200,
  info: 2200,
  warn: 5000,
  error: 6000,
}

export function useSystemAlert() {
  const toast = useToast()

  function notify(message: string, severity: SystemAlertSeverity = 'success'): void {
    toast.add({ severity, summary: message, life: LIFE_BY_SEVERITY[severity] })
  }

  return { notify }
}
