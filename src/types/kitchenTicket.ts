// Refleja KitchenTicketResource (app/Http/Resources/Api/V1/KitchenTicketResource.php)
// en nexolu-pos-api. El estado se rastrea por item (fuente de verdad); el
// kitchen_status del ticket es solo el rollup ("el peor" de sus items).
export type KitchenStatus = 'pending' | 'preparing' | 'ready'

export interface KitchenTicketItem {
  id: number
  name: string
  is_deleted: boolean
  quantity: number
  kitchen_status: KitchenStatus
}

export interface KitchenTicket {
  id: number
  table_name: string | null
  customer_name: string | null
  is_delivery: boolean
  kitchen_status: KitchenStatus
  created_at: string
  items: KitchenTicketItem[]
}

export interface UpdateKitchenStatusPayload {
  kitchen_status: KitchenStatus
  sale_item_ids?: number[]
}
