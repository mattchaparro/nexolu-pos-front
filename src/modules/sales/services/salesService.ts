import { fetchCategories } from '@/modules/catalog/services/catalogService'
import { httpClient } from '@/services/http/client'
import type { Discount } from '@/types/discount'
import type { Product } from '@/types/product'
import type { CreateSalePayload, Sale } from '@/types/sale'

// /products/sellable (distinto de /products, que pagina en 200) le trae a
// Vender el catalogo activo completo de una sola vez para filtrar/buscar en
// el cliente sin ida y vuelta por cada tecla - con mas de 200 productos,
// /products?per_page=200 nunca mandaba los que caian despues en el orden
// alfabetico (ej. los que empiezan por "Z"). Cacheado 10 min por negocio en
// el backend (ver App\Support\ProductAvailability::forBusiness).
export async function fetchSellableProducts(): Promise<Product[]> {
  const { data } = await httpClient.get<Product[]>('/products/sellable')
  return data
}

// Reexport: la llamada es identica a la que usa el modulo Catalogo (misma
// URL sin paginar, mismos datos) - una sola implementacion en
// catalog/services/catalogService.ts en vez de duplicarla aca.
export { fetchCategories as fetchProductCategories }

// per_page=200: descuentos activos son pocos en la practica, pero se pide el
// tope maximo que acepta DiscountController::index de una sola vez.
const DISCOUNTS_PAGE_SIZE = 200

export async function fetchActiveDiscounts(): Promise<Discount[]> {
  const { data } = await httpClient.get<{ data: Discount[] }>('/discounts', {
    params: { active_only: 1, per_page: DISCOUNTS_PAGE_SIZE },
  })
  return data.data
}

export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  const { data } = await httpClient.post<Sale>('/sales', payload)
  return data
}
