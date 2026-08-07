// Refleja ProductResource/ProductCategoryResource (app/Http/Resources/Api/V1)
// en nexolu-pos-api. Primer consumidor es el modulo Vender - se amplia
// cuando exista el modulo de Catalogo (gestion de productos/categorias).
export interface ProductCategory {
  id: number
  business_id: number
  parent_id: number | null
  name: string
  description: string | null
  icon: string | null
}

export interface Product {
  id: number
  business_id: number
  category: ProductCategory | null
  name: string
  description: string | null
  price: number
  stock: number
  low_stock_alert_threshold: number
  track_stock: boolean
  is_single_sale: boolean
  is_service: boolean
  price_varies_at_sale: boolean
  sku: string | null
  image: string | null
  is_active: boolean
}
