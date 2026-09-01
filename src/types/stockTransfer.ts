/** Traslado de inventario entre dos sedes. Ver App\Models\StockTransfer. */
export interface StockTransferItem {
  id: number
  product_id: number | null
  product_variant_id: number | null
  ingredient_id: number | null
  name: string | null
  quantity: number
  unit_cost_cop: number | null
}

export interface StockTransfer {
  id: number
  status: string
  reference: string | null
  notes: string | null
  transferred_at: string | null
  from_branch?: { id: number; name: string }
  to_branch?: { id: number; name: string }
  user?: { id: number | null; name: string | null }
  items?: StockTransferItem[]
}

export interface StockTransferLinePayload {
  product_id?: number | null
  product_variant_id?: number | null
  ingredient_id?: number | null
  quantity: number
}

export interface StockTransferPayload {
  from_branch_id: number
  to_branch_id: number
  notes?: string | null
  items: StockTransferLinePayload[]
}
