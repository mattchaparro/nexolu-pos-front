import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { AppointmentPayload, AppointmentStatus, ReschedulePayload } from '@/types/appointment'

import {
  createAppointment,
  rescheduleAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from '../services/appointmentService'

export function useAppointmentMutations() {
  const queryClient = useQueryClient()

  // Agendar puede crear una ServiceOrder vinculada (ver AppointmentService)
  // - invalida tambien ese listado por si el usuario navega ahi despues.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
    queryClient.invalidateQueries({ queryKey: ['service-orders'] })
  }

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: AppointmentPayload }) => updateAppointment(params.id, params.payload),
    onSuccess: invalidate,
  })

  const rescheduleMutation = useMutation({
    mutationFn: (params: { id: number; payload: ReschedulePayload }) => rescheduleAppointment(params.id, params.payload),
    onSuccess: invalidate,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (params: { id: number; status: AppointmentStatus }) => updateAppointmentStatus(params.id, params.status),
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, rescheduleMutation, updateStatusMutation }
}
