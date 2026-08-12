import { httpClient } from '@/services/http/client'
import type {
  BulkUpdateIngredientItem,
  BulkUpdateIngredientsResult,
  BulkUpdateProductItem,
  BulkUpdateProductsResult,
} from '@/types/bulkStockUpdate'

export async function bulkUpdateProducts(
  items: BulkUpdateProductItem[],
  notes: string | undefined,
): Promise<BulkUpdateProductsResult> {
  const { data } = await httpClient.post<BulkUpdateProductsResult>('/products/bulk-update', {
    items,
    notes: notes || undefined,
  })
  return data
}

export async function bulkUpdateIngredients(
  items: BulkUpdateIngredientItem[],
  notes: string | undefined,
): Promise<BulkUpdateIngredientsResult> {
  const { data } = await httpClient.post<BulkUpdateIngredientsResult>('/ingredients/bulk-update', {
    items,
    notes: notes || undefined,
  })
  return data
}
