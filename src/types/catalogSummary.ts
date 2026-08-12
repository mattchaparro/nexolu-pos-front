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
  show_inventory_value_card: boolean
  inventory_value_cop: number | null
}

export interface IngredientsSummary {
  active_count: number
  low_stock_count: number
}
