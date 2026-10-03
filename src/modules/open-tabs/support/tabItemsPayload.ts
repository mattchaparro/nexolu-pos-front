import type { SaleItem, SaleItemInput } from '@/types/sale'

import { savedItemExtra } from '../../sales/support/productOptions'

/**
 * Los items YA guardados de una cuenta, en el formato que espera
 * `PUT /open-tabs/{id}/items` (OpenTabItemsRequest).
 *
 * Ese endpoint REEMPLAZA el carrito completo, así que todo lo que no viaje
 * en el payload se pierde. Antes solo mandaba producto, cantidad y precio:
 * cambiar una cantidad borraba el descuento de la línea y la variante
 * elegida. El descuento no se notaba porque hasta ahora no había forma de
 * ponerlo en una cuenta (ver useNewItemsCart), y la variante hacía fallar la
 * validación en vez de perderse en silencio.
 */
export function toSyncItemsPayload(items: SaleItem[]): SaleItemInput[] {
  return items.map((item) => ({
    product_id: item.product.id,
    product_variant_id: item.product_variant?.id ?? null,
    quantity: item.quantity,
    // unit_price guardado incluye el recargo de las opciones; el API lo vuelve a sumar.
    unit_price: Number(item.unit_price) - savedItemExtra(item),
    discount_id: item.discount_id,
    ...(item.options?.length
      ? { options: item.options.map((o) => o.product_option_id).filter((id): id is number => id !== null) }
      : {}),
  }))
}
