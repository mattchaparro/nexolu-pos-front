import { useQuery } from '@tanstack/vue-query'

import { fetchBusiness } from '../services/businessService'

// Vive en dashboard/ porque hoy es el unico consumidor (nombre del negocio
// en el header). Query key sin prefijo de modulo a proposito: cuando exista
// Ajustes/Mi negocio, ese modulo puede reusar el mismo cache sin duplicar
// el fetch.
export function useBusiness() {
  return useQuery({
    queryKey: ['business'],
    queryFn: fetchBusiness,
  })
}
