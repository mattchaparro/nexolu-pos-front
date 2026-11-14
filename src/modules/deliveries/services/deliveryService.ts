import { httpClient } from '@/services/http/client'

// Refleja DeliveryResource (app/Http/Resources/Api/V1) en nexolu-pos-api.
export type DeliveryStatus = 'pending' | 'on_the_way' | 'delivered'

export interface Delivery {
  /** Id de la venta: un domicilio vive en su venta. */
  id: number
  order_number: number | null
  customer_name: string | null
  customer_phone: string | null
  address: string | null
  /** Pedido online para recoger (lo muestra Despacho). */
  is_pickup?: boolean
  notes: string | null
  items: { name: string; quantity: number }[]
  total: number
  /** Cuenta abierta: se cobra al entregar y la cierra el cajero. */
  is_open_tab: boolean
  payment_method: string | null
  is_paid_online: boolean
  status: DeliveryStatus
  /** La cocina ya lo terminó (o no pasa por cocina). */
  is_ready: boolean
  courier: { id: number; name: string } | null
  created_at: string | null
  taken_at: string | null
  delivered_at: string | null
}

export async function fetchDeliveries(): Promise<Delivery[]> {
  const { data } = await httpClient.get<Delivery[]>('/deliveries')
  return data
}

export async function takeDelivery(saleId: number): Promise<Delivery> {
  const { data } = await httpClient.post<Delivery>(`/deliveries/${saleId}/take`)
  return data
}

export async function markDelivered(saleId: number): Promise<Delivery> {
  const { data } = await httpClient.post<Delivery>(`/deliveries/${saleId}/deliver`)
  return data
}
