import { formatCop } from '@/utils/formatCop'

import type { Delivery } from '../services/deliveryService'

// Textos de un domicilio que comparten Domicilios (el domiciliario) y
// Despacho (la caja).

/**
 * Lo que hay que cobrarle al cliente en la puerta (0 = ya está pago). Lo
 * decide el API (DeliveryService::amountToCollect), el mismo que imprime el
 * ticket del domiciliario: así la pantalla y el papel nunca se contradicen.
 */
export function cashToCollect(delivery: Delivery): number {
  return Number(delivery.amount_to_collect ?? 0)
}

export function paymentText(
  delivery: Delivery,
  methodLabel: (id: string | null) => string,
): string {
  if (delivery.is_paid_online) {
    return 'Ya pagado en línea'
  }
  const amount = cashToCollect(delivery)
  if (amount > 0) {
    return delivery.is_open_tab ? `Cobrar ${formatCop(amount)} al entregar` : `Cobrar ${formatCop(amount)} en efectivo`
  }
  return delivery.payment_method ? `Pagado con ${methodLabel(delivery.payment_method)}` : 'Ya pagado'
}

export function deliveryTitle(delivery: Delivery): string {
  const who = delivery.customer_name || 'Cliente'
  return delivery.order_number ? `${who} · Pedido online #${delivery.order_number}` : who
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
