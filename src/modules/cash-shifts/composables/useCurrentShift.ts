import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'

import { fetchCurrentShift } from '../services/cashShiftService'

// refetchInterval: mientras el turno esta abierto, el "avance en vivo" (ventas
// de hoy, efectivo esperado) debe reflejar ventas que otros flujos del POS
// siguen registrando en segundo plano - sin poll el cajero veria un numero
// congelado desde que abrio el turno.
//
// enabled opcional (default: siempre activa, para la pantalla de Turnos de
// caja) - Vender la pasa atada a si el usuario/negocio realmente necesitan
// turno para vender (ver requiresOpenShift en SellView.vue): sin esto, un
// negocio sin el feature cash_closing recibia un 403 de
// GET /cash-shifts/current apenas abria Vender.
export function useCurrentShift(enabled?: Ref<boolean>) {
  return useQuery({
    queryKey: ['cash-shifts', 'current'],
    queryFn: fetchCurrentShift,
    refetchInterval: 30_000,
    enabled,
  })
}
