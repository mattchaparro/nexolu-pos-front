import { useQuery } from '@tanstack/vue-query'

import { fetchServiceWorkflows } from '../services/serviceWorkflowService'

export function useServiceWorkflows() {
  return useQuery({
    queryKey: ['superadmin', 'service-workflows'],
    queryFn: fetchServiceWorkflows,
  })
}
