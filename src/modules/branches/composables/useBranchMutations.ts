import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { createBranch, deactivateBranch, updateBranch } from '@/services/branches'
import type { BranchPayload } from '@/types/branch'

export function useBranchMutations() {
  const queryClient = useQueryClient()
  // ['branches'] alimenta tambien el selector de la barra superior (ver
  // useBranches): abrir o renombrar una sede tiene que verse ahi sin
  // recargar la pagina.
  // Alcanza a ['branches'] y a ['branches','managed']: el selector y la
  // pantalla de administracion tienen que verse iguales tras un cambio.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['branches'] })

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: BranchPayload }) =>
      updateBranch(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateBranch,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deactivateMutation }
}
