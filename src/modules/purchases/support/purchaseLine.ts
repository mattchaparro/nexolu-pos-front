// Tipo intermedio del formulario de compra - una fila por producto/insumo
// comprado. Distinto de PurchaseLineInput (types/purchase.ts): ese es lo
// que se manda al backend (product_id XOR ingredient_id ya resuelto), esto
// es lo que edita el usuario (con "kind" para saber cual select mostrar).
export interface PurchaseLineRow {
  uid: string
  kind: 'product' | 'ingredient'
  product_id: number | null
  /** Obligatorio cuando el producto elegido tiene variantes. */
  product_variant_id: number | null
  ingredient_id: number | null
  quantity: number | null
  line_total_cop: number | null
  notes: string
}

/** Producto, variante o insumo de la fila, con lo que hace falta para comparar costos. */
export function costReferenceItem(
  row: PurchaseLineRow,
  products: { id: number; price?: string | number | null; cost_price?: string | number | null; variants?: { id: number; price?: string | number | null; cost_price?: string | number | null }[] }[],
  ingredients: { id: number; cost_price?: string | number | null }[],
): { price?: string | number | null; cost_price?: string | number | null } | undefined {
  if (row.kind === 'ingredient') {
    return ingredients.find((i) => i.id === row.ingredient_id)
  }
  const product = products.find((p) => p.id === row.product_id)
  if (product && row.product_variant_id) {
    return product.variants?.find((v) => v.id === row.product_variant_id) ?? product
  }
  return product
}

export function newPurchaseLineRow(kind: 'product' | 'ingredient'): PurchaseLineRow {
  return {
    uid: crypto.randomUUID(),
    kind,
    product_id: null,
    product_variant_id: null,
    ingredient_id: null,
    quantity: 1,
    line_total_cop: null,
    notes: '',
  }
}

/** Cuantas veces por encima de lo normal se considera un costo sospechoso. */
export const UNUSUAL_COST_FACTOR = 5

/**
 * Costo por unidad muy por encima del costo actual (o, sin costo, del precio
 * de venta). Un cero de mas en el total pasa sin que nadie lo note y deja el
 * costo promedio inflado por meses: Las Banquitas registro 37 bolsas de Papas
 * por $59.447.000 en vez de $59.447 y su margen salio negativo hasta noviembre.
 *
 * @return el costo de referencia contra el que se comparo, o null si la fila se ve normal.
 */
export function unusualCostReference(
  row: PurchaseLineRow,
  item: { price?: string | number | null; cost_price?: string | number | null } | undefined,
): number | null {
  const quantity = Number(row.quantity) || 0
  const total = Number(row.line_total_cop) || 0
  if (!item || quantity <= 0 || total <= 0) {
    return null
  }
  const cost = Number(item.cost_price) || 0
  const reference = cost > 0 ? cost : Number(item.price) || 0
  if (reference <= 0) {
    return null
  }
  return total / quantity >= reference * UNUSUAL_COST_FACTOR ? reference : null
}
