import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchAuditLogs } from '../services/auditLogService'

export function useAuditLogs(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['audit-logs', search.value, page.value] as const),
    queryFn: () => fetchAuditLogs({ search: search.value || undefined, page: page.value }),
    placeholderData: keepPreviousData,
  })
}
