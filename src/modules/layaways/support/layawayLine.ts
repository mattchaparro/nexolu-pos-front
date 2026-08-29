// Tipo intermedio del formulario de apartado - una fila por producto. A
// diferencia de PurchaseLineRow no hay "kind" (siempre producto, nunca
// insumo - igual que un item de venta) ni total: se captura precio
// unitario y la cantidad, el subtotal se deriva en el cliente.
export interface LayawayLineRow {
  uid: string
  product_id: number | null
  /** Obligatorio cuando el producto elegido tiene variantes. */
  product_variant_id: number | null
  quantity: number
  unit_price: number | null
}

export function newLayawayLineRow(): LayawayLineRow {
  return {
    uid: crypto.randomUUID(),
    product_id: null,
    product_variant_id: null,
    quantity: 1,
    unit_price: null,
  }
}
