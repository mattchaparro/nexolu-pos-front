import { httpClient } from '@/services/http/client'
import type { Discount } from '@/types/discount'
import type { Product, ProductCategory } from '@/types/product'
import type { CreateSalePayload, Sale } from '@/types/sale'

// per_page=200: el POS necesita el catalogo casi completo de una sola vez
// para filtrar/buscar en el cliente sin ida y vuelta por cada tecla - tope
// que acepta ProductController::index (ver nexolu-pos-api).
const CATALOG_PAGE_SIZE = 200

export async function fetchSellableProducts(): Promise<Product[]> {
  const { data } = await httpClient.get<{ data: Product[] }>('/products', {
    params: { per_page: CATALOG_PAGE_SIZE },
  })
  return data.data
}

// Sin paginar (ProductCategoryController::index no pagina) - a diferencia
// de /products y /discounts, la app tiene JsonResource::withoutWrapping()
// global (ver AppServiceProvider), asi que una coleccion sin paginar llega
// como array plano, sin envoltorio 'data'. Solo las respuestas paginadas
// (products, discounts) mantienen data/links/meta, porque esa envoltura la
// pone el paginator, no JsonResource.
export async function fetchProductCategories(): Promise<ProductCategory[]> {
  const { data } = await httpClient.get<ProductCategory[]>('/product-categories')
  return data
}

export async function fetchActiveDiscounts(): Promise<Discount[]> {
  const { data } = await httpClient.get<{ data: Discount[] }>('/discounts', {
    params: { active_only: 1, per_page: CATALOG_PAGE_SIZE },
  })
  return data.data
}

export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  const { data } = await httpClient.post<Sale>('/sales', payload)
  return data
}
