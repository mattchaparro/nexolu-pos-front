import { useMutation, useQueryClient } from '@tanstack/vue-query'

import {
  activateBusiness,
  type ActivateBusinessPayload,
  changeBusinessPlan,
  createBusiness,
  type CreateBusinessPayload,
  extendBusinessTrial,
  setBusinessCustomPrice,
  updateBusinessConfig,
  type UpdateBusinessConfigPayload,
} from '../services/businessService'

/**
 * Acciones de edición sobre un negocio puntual - el id se pasa en cada
 * mutateAsync (no al crear el composable) para no capturar un id viejo si
 * el mismo componente se reutiliza para otro negocio. Invalidan el detalle
 * y el listado para que ambos reflejen el cambio.
 */
export function useBusinessMutations() {
  const queryClient = useQueryClient()

  const invalidate = (businessId: number) => {
    queryClient.invalidateQueries({ queryKey: ['superadmin', 'businesses', businessId] })
    queryClient.invalidateQueries({ queryKey: ['superadmin', 'businesses'], exact: false })
  }

  // Sin id: es el alta. Solo invalida el listado (todavia no hay detalle que
  // refrescar) y devuelve el negocio creado para poder abrirlo enseguida.
  const createMutation = useMutation({
    mutationFn: (payload: CreateBusinessPayload) => createBusiness(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'businesses'], exact: false })
    },
  })

  const updateConfigMutation = useMutation({
    mutationFn: (params: { id: number; payload: UpdateBusinessConfigPayload }) => updateBusinessConfig(params.id, params.payload),
    onSuccess: (_, params) => invalidate(params.id),
  })

  const activateMutation = useMutation({
    mutationFn: (params: { id: number; payload: ActivateBusinessPayload }) => activateBusiness(params.id, params.payload),
    onSuccess: (_, params) => invalidate(params.id),
  })

  const extendTrialMutation = useMutation({
    mutationFn: (params: { id: number; days: number }) => extendBusinessTrial(params.id, params.days),
    onSuccess: (_, params) => invalidate(params.id),
  })

  const setCustomPriceMutation = useMutation({
    mutationFn: (params: { id: number; customPriceCop: number | null }) => setBusinessCustomPrice(params.id, params.customPriceCop),
    onSuccess: (_, params) => invalidate(params.id),
  })

  const changePlanMutation = useMutation({
    mutationFn: (params: { id: number; plan: string }) => changeBusinessPlan(params.id, params.plan),
    onSuccess: (_, params) => invalidate(params.id),
  })

  return {
    createMutation,
    updateConfigMutation,
    activateMutation,
    extendTrialMutation,
    setCustomPriceMutation,
    changePlanMutation,
  }
}
