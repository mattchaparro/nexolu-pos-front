import { fetchCategories } from '@/modules/catalog/services/catalogService'
import { httpClient } from '@/services/http/client'
import type { Discount } from '@/types/discount'
import type { Product } from '@/types/product'
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

// Reexport: la llamada es identica a la que usa el modulo Catalogo (misma
// URL sin paginar, mismos datos) - una sola implementacion en
// catalog/services/catalogService.ts en vez de duplicarla aca.
export { fetchCategories as fetchProductCategories }

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
