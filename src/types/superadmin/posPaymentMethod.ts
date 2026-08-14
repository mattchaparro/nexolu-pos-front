// Refleja App\Http\Resources\Api\V1\SuperAdmin\PosPaymentMethodResource
// (nexolu-pos-api) - catalogo global de medios de pago del POS. No tiene
// endpoint de borrado a proposito (ver PosPaymentMethodController): un
// medio de pago del catalogo solo se desactiva.
export interface SuperAdminPosPaymentMethod {
  id: number
  key: string
  label: string
  is_active: boolean
  sort_order: number
  businesses_count: number
}

export interface PosPaymentMethodCreatePayload {
  key: string
  label: string
  is_active?: boolean
  sort_order?: number
}

export interface PosPaymentMethodUpdatePayload {
  label: string
  is_active?: boolean
  sort_order?: number
}
