import { httpClient } from '@/services/http/client'
import type { Business } from '@/types/business'

// Compartido entre modulos (Dashboard lo usa para el nombre del negocio,
// Vender para metodos de pago/cargos/domicilio) - no vive dentro de un
// modulo puntual, ver README.md "Modulos independientes".
export async function fetchBusiness(): Promise<Business> {
  const { data } = await httpClient.get<Business>('/business')
  return data
}
