// Refleja DiscountResource (app/Http/Resources/Api/V1/DiscountResource.php)
// en nexolu-pos-api.
export type DiscountType = 'percentage' | 'fixed'
export type DiscountScope = 'item' | 'cart'

export interface Discount {
  id: number
  business_id: number
  name: string
  type: DiscountType
  value: number
  scope: DiscountScope
  /** Solo presente si scope='item' y esta atado a un producto puntual. */
  product: { id: number; name: string } | null
  is_active: boolean
  /**
   * Con código es un CUPÓN de la tienda online: lo redime el comprador
   * escribiéndolo. Sin código es un descuento del mostrador, que el cajero
   * elige de una lista.
   */
  code: string | null
  starts_at: string | null
  ends_at: string | null
  /** Tope de redenciones. Nulo = sin tope. */
  max_uses: number | null
  used_count: number
  min_order_amount: number | null
}

// Refleja StoreDiscountRequest/UpdateDiscountRequest - product_id solo tiene
// sentido con scope='item' (DiscountsView/DiscountFormModal lo ocultan si no).
export interface DiscountPayload {
  name: string
  type: DiscountType
  value: number
  scope: DiscountScope
  product_id: number | null
  is_active: boolean
  code?: string | null
  starts_at?: string | null
  ends_at?: string | null
  max_uses?: number | null
  min_order_amount?: number | null
}
