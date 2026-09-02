import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchSuperAdminAuditActions, fetchSuperAdminAuditLogs } from '../services/auditLogService'

export function useSuperAdminAuditLogs(
  search: Ref<string>,
  action: Ref<string | null>,
  businessId: Ref<number | null>,
  page: Ref<number>,
) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'audit-logs', search.value, action.value, businessId.value, page.value] as const),
    queryFn: () =>
      fetchSuperAdminAuditLogs({
        search: search.value || undefined,
        action: action.value ?? undefined,
        business_id: businessId.value ?? undefined,
        page: page.value,
      }),
    // Sin esto la tabla parpadea en blanco al pasar de pagina, que en un
    // listado de auditoria se lee como "se perdieron los registros".
    placeholderData: keepPreviousData,
  })
}

export function useSuperAdminAuditActions() {
  return useQuery({
    queryKey: ['superadmin', 'audit-actions'],
    queryFn: fetchSuperAdminAuditActions,
    // El diccionario es una constante del backend: no cambia entre cargas.
    staleTime: Infinity,
  })
}
