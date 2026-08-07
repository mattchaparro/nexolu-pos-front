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
  product: { id: number } | null
  is_active: boolean
}
