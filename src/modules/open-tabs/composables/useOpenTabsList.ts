import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'

import { fetchOpenTabs } from '../services/openTabsService'

// enabled opcional (default: siempre activa) - Vender la pasa atada al
// feature open_tabs del negocio, para no disparar la consulta cuando el
// negocio no lo tiene habilitado (ver SellView.vue).
export function useOpenTabsList(enabled?: Ref<boolean>) {
  return useQuery({
    queryKey: ['open-tabs'],
    queryFn: fetchOpenTabs,
    enabled,
  })
}
