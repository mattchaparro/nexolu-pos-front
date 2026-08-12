// Tipo intermedio del formulario de compra - una fila por producto/insumo
// comprado. Distinto de PurchaseLineInput (types/purchase.ts): ese es lo
// que se manda al backend (product_id XOR ingredient_id ya resuelto), esto
// es lo que edita el usuario (con "kind" para saber cual select mostrar).
export interface PurchaseLineRow {
  uid: string
  kind: 'product' | 'ingredient'
  product_id: number | null
  ingredient_id: number | null
  quantity: number | null
  line_total_cop: number | null
  notes: string
}

export function newPurchaseLineRow(kind: 'product' | 'ingredient'): PurchaseLineRow {
  return {
    uid: crypto.randomUUID(),
    kind,
    product_id: null,
    ingredient_id: null,
    quantity: 1,
    line_total_cop: null,
    notes: '',
  }
}
