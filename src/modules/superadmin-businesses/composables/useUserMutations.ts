import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { createUser, type CreateUserPayload, resetUserPassword, toggleUser } from '../services/userService'

/**
 * Acciones sobre un usuario desde la pestaña "Equipo" de un negocio - el
 * business_id se pasa en cada mutateAsync (no al crear el composable, ver
 * el mismo criterio en useBusinessMutations.ts) para no invalidar la query
 * de un negocio viejo si el componente se reutiliza para otro. El team
 * viene embebido en BusinessesController::show, asi que invalidar ese
 * detalle alcanza para refrescar la lista.
 */
export function useUserMutations() {
  const queryClient = useQueryClient()

  const invalidate = (businessId: number) => {
    queryClient.invalidateQueries({ queryKey: ['superadmin', 'businesses', businessId] })
  }

  const createUserMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: (_, payload) => invalidate(payload.business_id),
  })

  const toggleUserMutation = useMutation({
    mutationFn: (params: { userId: number; businessId: number }) => toggleUser(params.userId),
    onSuccess: (_, params) => invalidate(params.businessId),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: number) => resetUserPassword(userId),
  })

  return { createUserMutation, toggleUserMutation, resetPasswordMutation }
}
