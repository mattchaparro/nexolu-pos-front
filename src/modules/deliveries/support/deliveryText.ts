import { formatCop } from '@/utils/formatCop'

import type { Delivery } from '../services/deliveryService'

// Textos de un domicilio que comparten Domicilios (el domiciliario) y
// Despacho (la caja).

/** Lo que hay que cobrarle al cliente en la puerta (0 = ya está pago). */
export function cashToCollect(delivery: Delivery): number {
  if (delivery.is_paid_online) {
    return 0
  }
  if (delivery.is_open_tab || delivery.payment_method === 'cash') {
    return delivery.total
  }
  return 0
}

export function paymentText(
  delivery: Delivery,
  methodLabel: (id: string | null) => string,
): string {
  if (delivery.is_paid_online) {
    return 'Ya pagado en línea'
  }
  if (delivery.is_open_tab) {
    return `Cobrar ${formatCop(delivery.total)} al entregar`
  }
  if (delivery.payment_method === 'cash') {
    return `Cobrar ${formatCop(delivery.total)} en efectivo`
  }
  return `Pagado con ${methodLabel(delivery.payment_method)}`
}

export function deliveryTitle(delivery: Delivery): string {
  const who = delivery.customer_name || 'Cliente'
  return delivery.order_number ? `${who} · Pedido online #${delivery.order_number}` : who
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
