// Fila del desglose por items de una orden de servicio. A diferencia de
// LayawayLineRow/PurchaseLineRow no hay product_id: el nombre es texto
// libre (una orden puede tener items que no son productos del catalogo,
// ej. "recargo domicilio"), aunque el picker de servicios autocompleta
// nombre/precio cuando se elige uno.
export interface ServiceOrderLineRow {
  uid: string
  name: string
  quantity: number
  unit_price: number | null
  user_id: number | null
  notes: string
}

export function newServiceOrderLineRow(): ServiceOrderLineRow {
  return {
    uid: crypto.randomUUID(),
    name: '',
    quantity: 1,
    unit_price: null,
    user_id: null,
    notes: '',
  }
}
