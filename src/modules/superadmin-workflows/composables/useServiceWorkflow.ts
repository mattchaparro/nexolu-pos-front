import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchServiceWorkflow } from '../services/serviceWorkflowService'

export function useServiceWorkflow(id: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'service-workflows', id.value] as const),
    queryFn: () => fetchServiceWorkflow(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}
