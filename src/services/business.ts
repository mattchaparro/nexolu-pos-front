import { httpClient } from '@/services/http/client'
import type { Business } from '@/types/business'

// Compartido entre modulos (Dashboard lo usa para el nombre del negocio,
// Vender para metodos de pago/cargos/domicilio, Ajustes para editarlo) - no
// vive dentro de un modulo puntual, ver README.md "Modulos independientes".
export async function fetchBusiness(): Promise<Business> {
  const { data } = await httpClient.get<Business>('/business')
  return data
}

export type UpdateBusinessPayload = Partial<
  Pick<Business, 'service_orders_show_catalog' | 'service_orders_default_service_name'>
>

export async function updateBusiness(payload: UpdateBusinessPayload): Promise<Business> {
  const { data } = await httpClient.put<Business>('/business', payload)
  return data
}
