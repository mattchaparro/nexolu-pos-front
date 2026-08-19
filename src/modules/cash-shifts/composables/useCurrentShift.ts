import { useQuery } from '@tanstack/vue-query'

import { fetchCurrentShift } from '../services/cashShiftService'

// refetchInterval: mientras el turno esta abierto, el "avance en vivo" (ventas
// de hoy, efectivo esperado) debe reflejar ventas que otros flujos del POS
// siguen registrando en segundo plano - sin poll el cajero veria un numero
// congelado desde que abrio el turno.
export function useCurrentShift() {
  return useQuery({
    queryKey: ['cash-shifts', 'current'],
    queryFn: fetchCurrentShift,
    refetchInterval: 30_000,
  })
}
