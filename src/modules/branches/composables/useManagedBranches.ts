import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { fetchBranches } from '@/services/branches'

/**
 * Todas las sedes del negocio, incluidas las desactivadas.
 *
 * Query aparte de useBranches (que alimenta el selector) y no un parametro
 * suyo: son dos preguntas distintas -- "a donde puedo entrar" y "que sedes
 * administro" -- y compartir cache haria que abrir Ajustes metiera sedes
 * cerradas en el desplegable de la barra superior.
 */
export function useManagedBranches() {
  const query = useQuery({
    queryKey: ['branches', 'managed'],
    queryFn: () => fetchBranches(true),
  })

  return { query, branches: computed(() => query.data.value?.data ?? []) }
}
