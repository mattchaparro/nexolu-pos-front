// Refleja la respuesta de GET /products/summary y /ingredients/summary
// (ProductController::summary()/IngredientController::summary() en
// nexolu-pos-api) - agregados sobre el catalogo completo, no solo la
// pagina visible del listado paginado, para las cards de resumen del
// Catalogo.
export interface ProductsSummary {
  low_stock_count: number
  out_of_stock_count: number
  single_sale_count: number
  with_recipe_count: number
  inactive_count: number
  show_inventory_value_card: boolean
  inventory_value_cop: number | null
}

// Valores de ?filter en GET /products (ver ProductController::index() en
// nexolu-pos-api) - a diferencia de category_id/search (puerto directo de
// legacy), esto es nuevo: legacy solo muestra estos estados como cards de
// resumen de solo lectura, nunca como filtros reales del listado.
export type ProductStockFilter = 'out_of_stock' | 'low_stock' | 'inactive' | 'single_sale' | 'recipe'

export interface IngredientsSummary {
  active_count: number
  low_stock_count: number
  out_of_stock_count: number
  inactive_count: number
}

// Valores de ?filter en GET /ingredients (ver IngredientController::index()
// en nexolu-pos-api) - mismo criterio que ProductStockFilter, sin
// single_sale/recipe (no aplican a un insumo).
export type IngredientStockFilter = 'out_of_stock' | 'low_stock' | 'inactive'

// Refleja GET /products/services-summary (ProductController::servicesSummary()).
export interface ServicesSummary {
  total_count: number
  variable_price_count: number
  fixed_price_count: number
}
