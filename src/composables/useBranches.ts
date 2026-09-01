import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { fetchBranches } from '@/services/branches'
import { useBranchStore } from '@/stores/branch.store'
import type { Branch } from '@/types/branch'

/**
 * Sedes a las que este usuario puede entrar, mas cual esta activa.
 *
 * Singleton por queryKey, igual que useBusiness: el selector de la barra
 * superior, Ajustes y el comparativo lo comparten sin pedirlo tres veces.
 *
 * De paso deja el store sincronizado con lo que el backend resolvio: si la
 * sede guardada ya no es accesible (al empleado lo movieron de local), el
 * backend responde otra y el selector tiene que mostrar esa, no la vieja.
 */
export function useBranches() {
  const branchStore = useBranchStore()

  const query = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await fetchBranches()

      branchStore.syncFromServer(
        response.current_branch_id,
        response.data.find((branch: Branch) => branch.id === response.current_branch_id) ?? null,
      )

      return response
    },
    // Las sedes casi no cambian: no vale la pena repreguntar en cada
    // navegacion como el resto del POS.
    staleTime: 5 * 60_000,
  })

  const branches = computed(() => query.data.value?.data ?? [])
  const canViewAllBranches = computed(() => query.data.value?.can_view_all_branches === true)
  /** Un negocio con una sola sede no necesita ver selector alguno. */
  const hasMultipleBranches = computed(() => branches.value.length > 1)

  return { query, branches, canViewAllBranches, hasMultipleBranches }
}
