import { httpClient } from '@/services/http/client'
import type {
  IngredientsSummary,
  IngredientStockFilter,
  ProductsSummary,
  ProductStockFilter,
  ServicesSummary,
} from '@/types/catalogSummary'
import type { PaginatedResponse } from '@/types/pagination'
import type {
  Ingredient,
  IngredientPayload,
  Product,
  ProductAttribute,
  ProductAttributePayload,
  ProductCategory,
  ProductCategoryPayload,
  ProductPayload,
  ProductVariant,
} from '@/types/product'

// Sin paginar (ProductCategoryController::index no pagina) - fuente unica
// de categorias, tambien usada por el modulo Vender (ver
// sales/services/salesService.ts, que reexporta esta funcion).
export async function fetchCategories(): Promise<ProductCategory[]> {
  const { data } = await httpClient.get<ProductCategory[]>('/product-categories')
  return data
}

export async function createCategory(payload: ProductCategoryPayload): Promise<ProductCategory> {
  const { data } = await httpClient.post<ProductCategory>('/product-categories', payload)
  return data
}

export async function updateCategory(
  id: number,
  payload: Partial<ProductCategoryPayload>,
): Promise<ProductCategory> {
  const { data } = await httpClient.put<ProductCategory>(`/product-categories/${id}`, payload)
  return data
}

export async function deleteCategory(id: number): Promise<void> {
  await httpClient.delete(`/product-categories/${id}`)
}

export interface FetchProductsParams {
  search?: string
  page?: number
  per_page?: number
  // Sin definir: trae bienes y servicios juntos (lo necesita Vender). false
  // = solo bienes (Catalogo, Compras, edicion masiva), true = solo
  // servicios (pestaña Servicios) - ver ProductController::index().
  is_service?: boolean
  // Incluye subcategorias (ver ProductCategory::idsIncludingChildren en el
  // backend) - puerto directo de Admin\InventoryController del legacy.
  category_id?: number
  filter?: ProductStockFilter
  // for_layaway/include_ids: filtro de elegibilidad para apartar (sin
  // servicios/inactivos/sin-stock, respeta layaway_allowed_category_ids) -
  // ver useLayawayProductOptions.ts, puerto de LayawaysController del
  // legacy.
  for_layaway?: boolean
  include_ids?: number[]
}

export async function fetchProducts(
  params: FetchProductsParams = {},
): Promise<PaginatedResponse<Product>> {
  const { data } = await httpClient.get<PaginatedResponse<Product>>('/products', { params })
  return data
}

// Cards de resumen (inventario bajo, sin stock, venta unica, con receta,
// valor de inventario) - agregados sobre el catalogo completo, no la
// pagina visible de fetchProducts.
export async function fetchProductsSummary(): Promise<ProductsSummary> {
  const { data } = await httpClient.get<ProductsSummary>('/products/summary')
  return data
}

// Cards de resumen de la pestaña Servicios (total, precio variable vs.
// fijo) - solo se llama cuando business.can_access_services es true (la
// ruta esta detras de middleware('feature:services')).
export async function fetchServicesSummary(): Promise<ServicesSummary> {
  const { data } = await httpClient.get<ServicesSummary>('/products/services-summary')
  return data
}

export async function fetchProduct(id: number): Promise<Product> {
  const { data } = await httpClient.get<Product>(`/products/${id}`)
  return data
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await httpClient.post<Product>('/products', payload)
  return data
}

export async function updateProduct(
  id: number,
  payload: Partial<ProductPayload>,
): Promise<Product> {
  const { data } = await httpClient.put<Product>(`/products/${id}`, payload)
  return data
}

export async function deleteProduct(id: number): Promise<void> {
  await httpClient.delete(`/products/${id}`)
}

// Pausa/activa UNA variante. Endpoint acotado a proposito: hacerlo por
// PUT /products obligaria a reenviar todas las variantes del producto, y
// omitir una la borraria (ProductService::syncVariants soft-deletea las que
// no vienen en el payload).
export async function toggleProductVariant(
  productId: number,
  variantId: number,
): Promise<ProductVariant> {
  const { data } = await httpClient.patch<ProductVariant>(
    `/products/${productId}/variants/${variantId}/toggle`,
  )
  return data
}

export async function duplicateProduct(id: number): Promise<Product> {
  const { data } = await httpClient.post<Product>(`/products/${id}/duplicate`)
  return data
}

// Solo se llama cuando business.feature_flags.ingredients esta activo (la
// ruta esta detras de middleware('feature:ingredients') - ver
// routes/api.php). per_page alto: el picker de receta del formulario de
// producto necesita la lista casi completa, igual que el catalogo de venta.
export async function fetchIngredientOptions(): Promise<Ingredient[]> {
  const { data } = await httpClient.get<PaginatedResponse<Ingredient>>('/ingredients', {
    params: { per_page: 200 },
  })
  return data.data
}

export interface FetchIngredientsParams {
  page?: number
  per_page?: number
  search?: string
  filter?: IngredientStockFilter
}

// Listado paginado para la pestaña Ingredientes del Catalogo (a diferencia
// de fetchIngredientOptions, que trae todo para el picker de receta).
export async function fetchIngredients(
  params: FetchIngredientsParams = {},
): Promise<PaginatedResponse<Ingredient>> {
  const { data } = await httpClient.get<PaginatedResponse<Ingredient>>('/ingredients', { params })
  return data
}

export async function fetchIngredientsSummary(): Promise<IngredientsSummary> {
  const { data } = await httpClient.get<IngredientsSummary>('/ingredients/summary')
  return data
}

export async function fetchIngredient(id: number): Promise<Ingredient> {
  const { data } = await httpClient.get<Ingredient>(`/ingredients/${id}`)
  return data
}

export async function createIngredient(payload: IngredientPayload): Promise<Ingredient> {
  const { data } = await httpClient.post<Ingredient>('/ingredients', payload)
  return data
}

export async function updateIngredient(
  id: number,
  payload: Partial<IngredientPayload>,
): Promise<Ingredient> {
  const { data } = await httpClient.put<Ingredient>(`/ingredients/${id}`, payload)
  return data
}

export async function deleteIngredient(id: number): Promise<void> {
  await httpClient.delete(`/ingredients/${id}`)
}

// Sin paginar (ProductAttributeController::index no pagina, mismo criterio
// que /product-categories) - catalogo chico por negocio, reutilizado tanto
// por la pantalla de gestion (ProductAttributesView) como por el editor de
// variantes del formulario de producto (ProductVariantsEditor). Solo se
// llama cuando business.feature_flags.variants esta activo (la ruta esta
// detras de middleware('feature:variants')).
export async function fetchProductAttributes(): Promise<ProductAttribute[]> {
  const { data } = await httpClient.get<ProductAttribute[]>('/product-attributes')
  return data
}

export async function createProductAttribute(
  payload: ProductAttributePayload,
): Promise<ProductAttribute> {
  const { data } = await httpClient.post<ProductAttribute>('/product-attributes', payload)
  return data
}

export async function updateProductAttribute(
  id: number,
  payload: Partial<ProductAttributePayload>,
): Promise<ProductAttribute> {
  const { data } = await httpClient.put<ProductAttribute>(`/product-attributes/${id}`, payload)
  return data
}

export async function deleteProductAttribute(id: number): Promise<void> {
  await httpClient.delete(`/product-attributes/${id}`)
}

/**
 * Ventas cruzadas: qué sugerir a quien lleve este producto.
 *
 * Endpoint aparte del producto y no un campo del payload porque es una
 * relación, no un atributo: se guarda después de que el producto existe (uno
 * nuevo todavía no tiene id cuando se llena el formulario).
 */
export async function fetchCrossSells(productId: number): Promise<Product[]> {
  const { data } = await httpClient.get<Product[]>(`/products/${productId}/cross-sells`)
  return data
}

export async function saveCrossSells(productId: number, ids: number[]): Promise<Product[]> {
  const { data } = await httpClient.put<Product[]>(`/products/${productId}/cross-sells`, {
    cross_sell_ids: ids,
  })
  return data
}
