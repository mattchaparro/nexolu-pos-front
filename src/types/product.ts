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
  /** Si sale en la tienda online. */
  is_published: boolean
  sort_order: number
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

// Feature "variants" - ver ProductAttribute/ProductAttributeValue/
// ProductVariant en el backend. Un atributo (ej. "Talla") es reutilizable
// por todo el negocio; sus valores (S/M/L) se combinan manualmente por
// producto para armar variantes con precio/stock/sku propios.
export interface ProductAttributeValue {
  id: number
  value: string
  sort_order: number
}

export interface ProductAttribute {
  id: number
  business_id: number
  name: string
  values: ProductAttributeValue[]
}

export interface ProductAttributePayload {
  name: string
  values: { id?: number; value: string; sort_order?: number }[]
}

// Etiqueta de un valor de atributo YA elegido en una variante concreta -
// distinto de ProductAttributeValue (que es del catalogo reutilizable):
// aca vienen embebidos el nombre del atributo y el valor, listos para
// armar un label como "Talla: M" sin tener que cruzar con el catalogo.
export interface ProductVariantAttributeValue {
  product_attribute_id: number
  product_attribute_name: string
  product_attribute_value_id: number
  value: string
}

export interface ProductVariant {
  id: number
  sku: string
  price: number
  cost_price: number | null
  stock: number
  low_stock_alert_threshold: number | null
  is_active: boolean
  attribute_values: ProductVariantAttributeValue[]
}

export interface ProductVariantInput {
  id?: number
  sku: string
  price: number
  cost_price?: number
  stock?: number
  low_stock_alert_threshold?: number | null
  is_active?: boolean
  attribute_value_ids: number[]
}

// Una foto del catalogo, ya procesada por el backend (reescalada a WebP y
// sin metadatos EXIF) - ver ProductImageService en nexolu-pos-api.
export interface ProductImage {
  id: number
  product_id: number
  product_variant_id: number | null
  url: string
  thumbnail_url: string
  alt: string | null
  sort_order: number
}

/**
 * Foto elegida en el formulario de un producto que TODAVIA no existe. Se
 * queda en el navegador (con una preview local) hasta que el producto se
 * guarda, y recien ahi se sube: el endpoint de fotos cuelga de
 * /products/{id}/images y necesita un id real.
 *
 * `variantKey` apunta a la variante destino. Al crear no puede ser un id
 * (las variantes tampoco existen aun), asi que es la combinacion ordenada de
 * attribute_value_ids; al editar es el id de la variante. Quien resuelve esa
 * clave a un id real es ProductFormView, con las variantes que devuelve la
 * respuesta de creacion.
 */
export interface PendingProductImage {
  file: File
  previewUrl: string
  variantKey: string | null
}

/** Opcion del selector "a que variante pertenece esta foto". */
export interface VariantPhotoTarget {
  key: string
  label: string
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
  // URL desnormalizada de la foto principal, suficiente para los listados.
  // La galeria completa (`images`) solo viene en el detalle del producto.
  image: string | null
  images?: ProductImage[]
  is_active: boolean
  // Publicar en la tienda online es una decision aparte de estar activo en
  // el POS: hacen falta las dos para que un producto se vea en internet.
  is_published: boolean
  online_description: string | null
  // Solo presentes cuando el negocio tiene la feature "ingredients" -
  // ProductResource los carga condicionalmente (whenLoaded).
  ingredients?: ProductIngredient[]
  has_recipe?: boolean
  // Solo presentes cuando el negocio tiene la feature "variants". Con
  // variantes, "stock" arriba ya viene como la suma agregada de las
  // variantes activas (ver ProductAvailability::effectiveStock en el
  // backend) - no hace falta sumarlo a mano en el front.
  variants?: ProductVariant[]
  has_variants?: boolean
  // Falso para venta-unica, para productos con receta, y para productos
  // con variantes: en los tres casos el stock no se puede escribir a mano
  // sobre el producto (venta-unica es siempre 1/0, receta se calcula desde
  // los ingredientes, variantes se administra por variante - ver
  // ProductResource/StockService).
  can_manage_stock?: boolean
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
  // "Platos que lo usan" (ver IngredientController::index/show) - solo
  // presente cuando el endpoint carga la relacion products.
  products?: { id: number; name: string }[]
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
  is_published?: boolean
  online_description?: string | null
  variants?: ProductVariantInput[]
  category_id: number
  ingredients?: ProductRecipeLineInput[]
}
