import type { OrderStatus } from '@/types/order'

/**
 * Vocabulario visible de los estados. Vive en un solo sitio porque el
 * listado, el detalle y los botones de accion dicen lo mismo del mismo
 * estado; duplicarlo garantiza que se desincronicen.
 */
interface StatusMeta {
  /** Como se llama el estado cuando el pedido YA esta ahi. */
  label: string
  /** Como se llama la ACCION de llevarlo ahi (el texto del boton). */
  action: string
  classes: string
}

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  pending: { label: 'Nuevo', action: 'Dejar pendiente', classes: 'bg-amber-100 text-amber-700' },
  confirmed: {
    label: 'Confirmado',
    action: 'Confirmar y facturar',
    classes: 'bg-emerald-100 text-emerald-700',
  },
  preparing: {
    label: 'Preparando',
    action: 'Marcar en preparación',
    classes: 'bg-sky-100 text-sky-700',
  },
  shipped: {
    label: 'Enviado',
    action: 'Marcar como enviado',
    classes: 'bg-indigo-100 text-indigo-700',
  },
  delivered: {
    label: 'Entregado',
    action: 'Marcar como entregado',
    classes: 'bg-slate-100 text-slate-600',
  },
  cancelled: { label: 'Cancelado', action: 'Cancelar pedido', classes: 'bg-red-100 text-red-700' },
  expired: { label: 'Vencido', action: 'Vencido', classes: 'bg-slate-100 text-slate-400' },
}

export const ORDER_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Nuevos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviados' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
]

export function statusMeta(status: OrderStatus): StatusMeta {
  return (
    ORDER_STATUS[status] ?? {
      label: status,
      action: status,
      classes: 'bg-slate-100 text-slate-600',
    }
  )
}

/** Numero colombiano a enlace de WhatsApp, con el prefijo del pais. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.startsWith('57') ? digits : `57${digits}`
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}
