import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { PayServiceOrderPayload, ServiceOrderPayload } from '@/types/serviceOrder'

import {
  cancelServiceOrder,
  createServiceOrder,
  payServiceOrder,
  setServiceOrderStage,
  updateServiceOrder,
} from '../services/serviceOrderService'

export function useServiceOrderMutations() {
  const queryClient = useQueryClient()

  // Tambien invalida 'appointments': AppointmentDetailModal muestra la
  // etapa a traves de appointment.service_order, no de un fetch propio
  // (mismo cuidado simetrico que useAppointmentMutations con 'service-orders').
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service-orders'] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  const createMutation = useMutation({
    mutationFn: createServiceOrder,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: ServiceOrderPayload }) => updateServiceOrder(params.id, params.payload),
    onSuccess: invalidate,
  })

  const payMutation = useMutation({
    mutationFn: (params: { id: number; payload: PayServiceOrderPayload }) => payServiceOrder(params.id, params.payload),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelServiceOrder,
    onSuccess: invalidate,
  })

  const setStageMutation = useMutation({
    mutationFn: (params: { id: number; stageId: number }) => setServiceOrderStage(params.id, params.stageId),
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, payMutation, cancelMutation, setStageMutation }
}
