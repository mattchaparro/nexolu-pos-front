import { useQuery } from '@tanstack/vue-query'

import { fetchServiceWorkflow } from '@/services/serviceWorkflow'

// null cuando el negocio no tiene un workflow asignado - las vistas que
// consumen esto ocultan el badge/picker de etapa por completo en ese caso.
export function useServiceWorkflow() {
  return useQuery({
    queryKey: ['service-workflow'],
    queryFn: fetchServiceWorkflow,
  })
}
