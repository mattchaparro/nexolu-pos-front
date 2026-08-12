import { httpClient } from '@/services/http/client'
import type { StockMovement, StockMovementPayload, StockMovementReason } from '@/types/inventory'
import type { PaginatedResponse } from '@/types/pagination'

// Motivos globales (business_id null) - ver StockMovementReasonSeeder en
// nexolu-pos-api. Sin paginar, ~10 filas fijas.
export async function fetchStockMovementReasons(): Promise<StockMovementReason[]> {
  const { data } = await httpClient.get<StockMovementReason[]>('/stock-movement-reasons')
  return data
}

export async function fetchProductStockMovements(
  productId: number,
  page = 1,
): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await httpClient.get<PaginatedResponse<StockMovement>>('/stock-movements', {
    params: { product_id: productId, page },
  })
  return data
}

export async function createProductStockMovement(
  productId: number,
  payload: StockMovementPayload,
): Promise<StockMovement> {
  const { data } = await httpClient.post<StockMovement>('/stock-movements', { product_id: productId, ...payload })
  return data
}

export async function fetchIngredientStockMovements(
  ingredientId: number,
  page = 1,
): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await httpClient.get<PaginatedResponse<StockMovement>>('/ingredient-stock-movements', {
    params: { ingredient_id: ingredientId, page },
  })
  return data
}

export async function createIngredientStockMovement(
  ingredientId: number,
  payload: StockMovementPayload,
): Promise<StockMovement> {
  const { data } = await httpClient.post<StockMovement>('/ingredient-stock-movements', {
    ingredient_id: ingredientId,
    ...payload,
  })
  return data
}
