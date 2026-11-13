// Refleja KitchenTicketResource (app/Http/Resources/Api/V1/KitchenTicketResource.php)
// en nexolu-pos-api. El estado se rastrea por item (fuente de verdad); el
// kitchen_status del ticket es solo el rollup ("el peor" de sus items).
export type KitchenStatus = 'pending' | 'preparing' | 'ready'

export interface KitchenTicketItem {
  id: number
  name: string
  is_deleted: boolean
  quantity: number
  // Las porciones repetidas llegan juntas: quantity 2 = «Jack Daniels ×2».
  options: { group: string; name: string; quantity: number }[]
  kitchen_status: KitchenStatus
}

export interface KitchenTicket {
  id: number
  table_name: string | null
  customer_name: string | null
  customer_phone: string | null
  /** Nota de la cuenta: alergias, "sin cebolla", dirección del domicilio... */
  notes: string | null
  is_delivery: boolean
  /** A dónde va el domicilio (nulo si no es domicilio o no se escribió). */
  delivery_address: string | null
  /**
   * Pedido online: su venta ya está registrada (pagó en línea o el negocio
   * verificó el pago). No se cobra en la comandera: sale de ella al
   * despacharse.
   */
  online_order: {
    number: number
    status: string
    is_pickup: boolean
    is_paid_online: boolean
  } | null
  kitchen_status: KitchenStatus
  created_at: string
  items: KitchenTicketItem[]
}

export interface UpdateKitchenStatusPayload {
  kitchen_status: KitchenStatus
  sale_item_ids?: number[]
}
