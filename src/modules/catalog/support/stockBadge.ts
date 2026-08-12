// Badge de stock (color + texto) para las filas de Productos/Insumos del
// Catalogo - mismo criterio de color en los dos (rojo=agotado, ambar=stock
// bajo, gris=normal). Number(): stock/low_stock_alert_threshold/min_stock
// son decimal:X en el backend para Ingredient (Product.stock es entero) y
// llegan como string en el JSON - mismo caso que Sale.total en otros
// modulos.
import type { Ingredient, Product } from '@/types/product'

export interface StockBadgeInfo {
  label: string
  class: string
}

export function productStockBadge(product: Product): StockBadgeInfo {
  if (product.is_service) {
    return { label: 'Servicio', class: 'bg-slate-100 text-slate-600' }
  }
  if (!product.track_stock) {
    return { label: 'Sin control', class: 'bg-slate-100 text-slate-500' }
  }
  if (product.stock <= 0) {
    return { label: '0 en stock', class: 'bg-red-100 text-red-600' }
  }
  const threshold = product.low_stock_alert_threshold ?? 5
  if (product.stock <= threshold) {
    return { label: `${product.stock} en stock`, class: 'bg-amber-100 text-amber-600' }
  }
  return { label: `${product.stock} en stock`, class: 'bg-slate-100 text-slate-500' }
}

export function ingredientStockBadge(ingredient: Ingredient): StockBadgeInfo {
  const stock = Number(ingredient.stock)
  const label = `${stock} ${ingredient.unit}`
  if (stock <= 0) {
    return { label, class: 'bg-red-100 text-red-600' }
  }
  const threshold = ingredient.min_stock != null ? Number(ingredient.min_stock) : 5
  if (stock <= threshold) {
    return { label, class: 'bg-amber-100 text-amber-600' }
  }
  return { label, class: 'bg-slate-100 text-slate-500' }
}
