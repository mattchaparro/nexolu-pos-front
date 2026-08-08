import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type {
  Ingredient,
  Product,
  ProductCategory,
  ProductCategoryPayload,
  ProductPayload,
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

export async function updateCategory(id: number, payload: Partial<ProductCategoryPayload>): Promise<ProductCategory> {
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
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<PaginatedResponse<Product>> {
  const { data } = await httpClient.get<PaginatedResponse<Product>>('/products', { params })
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

export async function updateProduct(id: number, payload: Partial<ProductPayload>): Promise<Product> {
  const { data } = await httpClient.put<Product>(`/products/${id}`, payload)
  return data
}

export async function deleteProduct(id: number): Promise<void> {
  await httpClient.delete(`/products/${id}`)
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
