// Refleja StockMovementResource/StockMovementReasonResource
// (app/Http/Resources/Api/V1) en nexolu-pos-api. Un solo StockMovement
// para productos e insumos (product_id XOR ingredient_id), igual que en el
// backend - ver StockService.
export type StockMovementType = 'entry' | 'exit' | 'adjustment'

export interface StockMovementReason {
  id: number
  code: string
  label: string
}

export interface StockMovement {
  id: number
  product_id: number | null
  ingredient_id: number | null
  type: StockMovementType
  quantity: number
  unit_cost_cop: number | null
  reference: string | null
  notes: string | null
  reason: StockMovementReason | null
  user_id: number
  created_at: string
}

// Payload de Store(Ingredient)StockMovementRequest. "quantity" cambia de
// significado segun "type": magnitud a mover para entry/exit, nuevo stock
// absoluto para adjustment - igual que StockService::adjust().
export interface StockMovementPayload {
  type: StockMovementType
  quantity: number
  unit_cost_cop?: number | null
  stock_movement_reason_id?: number | null
  notes?: string | null
}
