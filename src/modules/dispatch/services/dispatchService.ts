import type { Delivery } from '@/modules/deliveries/services/deliveryService'
import type { PrintJob } from '@/modules/printing/services/printingService'
import { httpClient } from '@/services/http/client'

// Refleja DispatchController en nexolu-pos-api.

export interface DispatchBoard {
  /** Domicilios por llevar, en camino y entregados hoy. */
  deliveries: Delivery[]
  /** Pedidos online para recoger que el cliente no se ha llevado. */
  pickups: Delivery[]
  /** Empleados que hacen domicilios. */
  couriers: { id: number; name: string }[]
}

export async function fetchDispatchBoard(): Promise<DispatchBoard> {
  const { data } = await httpClient.get<DispatchBoard>('/dispatch')
  return data
}

/** «Salió a domicilio»: imprime factura + ticket del domiciliario. */
export async function sendOutDelivery(saleId: number, courierId: number | null): Promise<Delivery> {
  const { data } = await httpClient.post<Delivery>(`/dispatch/${saleId}/send-out`, {
    courier_id: courierId,
  })
  return data
}

export async function markDispatchDelivered(saleId: number): Promise<Delivery> {
  const { data } = await httpClient.post<Delivery>(`/dispatch/${saleId}/delivered`)
  return data
}

export async function markPickedUp(saleId: number): Promise<void> {
  await httpClient.post(`/dispatch/${saleId}/picked-up`)
}

export async function reprintKitchenTicket(saleId: number): Promise<PrintJob> {
  const { data } = await httpClient.post<PrintJob>(`/dispatch/${saleId}/kitchen-ticket`)
  return data
}
