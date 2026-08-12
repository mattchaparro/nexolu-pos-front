// Refleja ProductResource/ProductCategoryResource/IngredientResource
// (app/Http/Resources/Api/V1) en nexolu-pos-api. Consumido por el modulo
// Vender (catalogo de venta, solo lectura) y por el modulo Catalogo
// (gestion de categorias/productos/insumos).
export interface ProductCategory {
  id: number
  business_id: number
  parent_id: number | null
  name: string
  description: string | null
  icon: string | null
}

// Solo se llena cuando el producto viene de Product.ingredients (recipe) -
// "quantity" es el pivot ingredient_product.quantity, no el stock del
// insumo.
export interface ProductIngredient {
  id: number
  business_id: number
  name: string
  unit: string
  stock: number
  cost_price: number | null
  min_stock: number | null
  is_active: boolean
  quantity: number
}

export interface Product {
  id: number
  business_id: number
  category: ProductCategory | null
  name: string
  description: string | null
  how_to_use: string | null
  price: number
  cost_price: number
  stock: number
  low_stock_alert_threshold: number | null
  track_stock: boolean
  is_single_sale: boolean
  is_service: boolean
  price_varies_at_sale: boolean
  duration_minutes: number | null
  sku: string | null
  image: string | null
  is_active: boolean
  // Solo presentes cuando el negocio tiene la feature "ingredients" -
  // ProductResource los carga condicionalmente (whenLoaded).
  ingredients?: ProductIngredient[]
  has_recipe?: boolean
}

// Insumo (IngredientResource) - modulo Catalogo, feature "ingredients".
export interface Ingredient {
  id: number
  business_id: number
  name: string
  unit: string
  stock: number
  cost_price: number | null
  min_stock: number | null
  is_active: boolean
  created_at: string
}

export interface ProductRecipeLineInput {
  ingredient_id: number
  quantity: number
}

// Payloads que esperan Store/UpdateProductCategoryRequest en nexolu-pos-api.
export interface ProductCategoryPayload {
  name: string
  description?: string | null
  icon?: string
  parent_id?: number | null
}

// Payload de Store/UpdateIngredientRequest. "stock" solo se envia al crear
// (inicial) - despues de eso el stock se ajusta con movimientos, igual que
// Product (aunque el backend tecnicamente permite pisarlo via update, el
// formulario de Catalogo no expone ese campo en edicion a proposito, para
// no perder la trazabilidad de StockMovement).
export interface IngredientPayload {
  name: string
  unit: string
  stock?: number
  min_stock?: number | null
  cost_price?: number | null
  is_active?: boolean
}

// Payloads que esperan Store/UpdateProductRequest en nexolu-pos-api.
export interface ProductPayload {
  name: string
  description?: string | null
  how_to_use?: string | null
  price: number
  cost_price?: number
  stock?: number
  low_stock_alert_threshold?: number | null
  track_stock?: boolean
  is_single_sale?: boolean
  is_service?: boolean
  price_varies_at_sale?: boolean
  duration_minutes?: number | null
  sku?: string | null
  is_active?: boolean
  category_id: number
  ingredients?: ProductRecipeLineInput[]
}
