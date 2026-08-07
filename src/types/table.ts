// Refleja BusinessTableResource (app/Http/Resources/Api/V1) en
// nexolu-pos-api.
export interface BusinessTable {
  id: number
  business_id: number
  name: string
  number: number
  is_active: boolean
  has_open_sale: boolean
}
