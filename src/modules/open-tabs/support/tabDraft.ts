import type { SaleItem } from '@/types/sale'

/** itemId -> cantidad deseada. Solo lleva los items tocados. */
export type QuantityDraft = Record<number, number>

/** itemId -> descuento deseado (null = sin descuento). Solo los tocados. */
export type DiscountDraft = Record<number, number | null>

export function draftQuantityOf(item: SaleItem, quantities: QuantityDraft): number {
  return quantities[item.id] ?? item.quantity
}

/**
 * El descuento vigente de un item con el borrador aplicado. Usa `in` y no
 * `??` porque null es un valor legítimo del borrador ("quitale el
 * descuento"), y con `??` eso caería de vuelta al descuento guardado.
 */
export function draftDiscountOf(item: SaleItem, discounts: DiscountDraft): number | null {
  return item.id in discounts ? discounts[item.id] : item.discount_id
}

/**
 * Los items guardados con el borrador aplicado - lo que la UI pinta y lo que
 * se manda al confirmar. Un item llevado a 0 desaparece de la lista (y
 * reaparece si se descarta el borrador).
 *
 * `discount_amount` se deja como está: el monto real lo calcula el servidor
 * al guardar (un descuento puede ser fijo o porcentual, y el cliente no
 * decide plata).
 */
export function applyDraftToItems(
  items: SaleItem[],
  quantities: QuantityDraft,
  discounts: DiscountDraft,
): SaleItem[] {
  return items
    .map((item) => {
      const quantity = draftQuantityOf(item, quantities)
      const discountId = draftDiscountOf(item, discounts)

      if (quantity === item.quantity && discountId === item.discount_id) {
        return item
      }

      return {
        ...item,
        quantity,
        discount_id: discountId,
        subtotal: quantity * Number(item.unit_price),
      }
    })
    .filter((item) => item.quantity > 0)
}

export function hasDraftChanges(
  items: SaleItem[],
  quantities: QuantityDraft,
  discounts: DiscountDraft,
): boolean {
  return items.some(
    (item) =>
      draftQuantityOf(item, quantities) !== item.quantity ||
      draftDiscountOf(item, discounts) !== item.discount_id,
  )
}
