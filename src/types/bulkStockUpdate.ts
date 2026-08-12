// Payloads/respuestas de POST /products/bulk-update y
// /ingredients/bulk-update (BulkUpdateProductsRequest/
// BulkUpdateIngredientsRequest en nexolu-pos-api) - edicion masiva tipo
// hoja de calculo (doble clic + tab) para la pantalla de ajuste masivo del
// Catalogo. Solo se mandan los campos que de verdad cambiaron por fila.
export interface BulkUpdateProductItem {
  product_id: number
  new_name?: string | null
  new_stock?: number | null
  new_cost?: number | null
  new_price?: number | null
}

export interface BulkUpdateIngredientItem {
  ingredient_id: number
  new_name?: string | null
  new_stock?: number | null
  new_cost?: number | null
}

export interface BulkUpdateProductsResult {
  name_count: number
  stock_count: number
  cost_count: number
  price_count: number
}

export interface BulkUpdateIngredientsResult {
  name_count: number
  stock_count: number
  cost_count: number
}
