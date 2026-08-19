import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'

import { fetchActiveDiscounts } from '../services/salesService'

// enabled opcional (default: siempre activa) - Vender la pasa atada al
// feature discounts del negocio y al permiso discounts.apply/discounts.manage
// del usuario, para no disparar la consulta (y el toast de "no tienes
// permiso") cuando ninguno de los dos aplica. Mismo patron que useTables()
// con open_tabs.
export function useActiveDiscounts(enabled?: Ref<boolean>) {
  return useQuery({
    queryKey: ['discounts', 'active'],
    queryFn: fetchActiveDiscounts,
    enabled,
  })
}
