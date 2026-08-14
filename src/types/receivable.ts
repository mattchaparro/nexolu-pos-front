// Refleja ReceivableResource (app/Http/Resources/Api/V1/ReceivableResource.php)
// en nexolu-pos-api. Un fiado nunca se crea a mano desde el frontend - nace
// automaticamente al cerrar una venta a credito (SaleService::syncReceivable)
// y aca solo se lista/cobra.
export type ReceivableStatus = 'pending' | 'paid'

export interface Receivable {
  id: number
  business_id: number
  sale_id: number
  customer_name: string | null
  customer_phone: string | null
  customer_identification: string | null
  amount: number
  balance: number
  status: ReceivableStatus
  payment_method: string | null
  paid_at: string | null
  collected_by_user_id: number | null
  notes: string | null
}

// Refleja CollectReceivableRequest - un fiado se cobra completo de una sola
// vez (sin abonos parciales, a diferencia de Apartados), y nunca con
// 'credit' como medio (ver ReceivableService::collect()).
export interface CollectReceivablePayload {
  payment_method: string
  customer_name?: string | null
  customer_phone?: string | null
  customer_identification?: string | null
}
