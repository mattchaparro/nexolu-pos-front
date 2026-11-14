import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import {
  assignReservationTable,
  confirmReservation,
  createReservation,
  fetchBusinessHours,
  fetchReservations,
  fetchReservationSettings,
  fetchReservationSummary,
  rescheduleReservation,
  runReservationAction,
  updateBusinessHours,
  updateReservation,
  updateReservationSettings,
  type ReservationAction,
  type ReservationDraft,
  type ReservationFilters,
  type ReservationRules,
  type WeeklyHours,
} from '../services/reservationService'

/** La lista de un dia (o rango). Se refresca sola: no hay websockets y llegan reservas de internet. */
export function useReservationList(filters: Ref<ReservationFilters>, enabled?: Ref<boolean>) {
  return useQuery({
    queryKey: computed(() => ['reservations', 'list', filters.value]),
    queryFn: () => fetchReservations(filters.value),
    enabled: enabled ?? true,
    refetchInterval: 30_000,
  })
}

/** Cuantas esperan respuesta, para el contador del menu. */
export function usePendingReservationCount(enabled: Ref<boolean>) {
  const query = useQuery({
    queryKey: ['reservations', 'summary'],
    queryFn: fetchReservationSummary,
    enabled,
    refetchInterval: 30_000,
  })

  return computed(() => query.data.value?.pending ?? 0)
}

export function useReservationMutations() {
  const queryClient = useQueryClient()
  const { notify } = useSystemAlert()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['reservations'] })
  const onError = (error: unknown) => notify(extractErrorMessage(error, 'No pudimos completar la acción.'), 'error')

  return {
    create: useMutation({
      mutationFn: (draft: ReservationDraft) => createReservation(draft),
      onSuccess: () => notify('Reserva anotada'),
      onSettled: refresh,
    }),
    confirm: useMutation({
      mutationFn: ({ id, tableId }: { id: number; tableId?: number | null }) => confirmReservation(id, tableId),
      onSuccess: () => notify('Reserva confirmada'),
      onError,
      onSettled: refresh,
    }),
    assignTable: useMutation({
      mutationFn: ({ id, tableId }: { id: number; tableId: number }) => assignReservationTable(id, tableId),
      onSuccess: () => notify('Mesa asignada'),
      onError,
      onSettled: refresh,
    }),
    act: useMutation({
      mutationFn: ({ id, action }: { id: number; action: ReservationAction }) => runReservationAction(id, action),
      onError,
      onSettled: refresh,
    }),
    reschedule: useMutation({
      mutationFn: ({ id, startsAt, partySize }: { id: number; startsAt: string; partySize?: number }) =>
        rescheduleReservation(id, startsAt, partySize),
      onSuccess: () => notify('Reserva cambiada'),
      onSettled: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateReservation>[1] }) =>
        updateReservation(id, payload),
      onError,
      onSettled: refresh,
    }),
  }
}

export function useReservationSettings() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({ queryKey: ['reservation-settings'], queryFn: fetchReservationSettings })
  const hoursQuery = useQuery({ queryKey: ['business-hours'], queryFn: fetchBusinessHours })

  const saveRules = useMutation({
    mutationFn: (rules: Partial<ReservationRules>) => updateReservationSettings(rules),
    onSuccess: (state) => queryClient.setQueryData(['reservation-settings'], state),
  })

  const saveHours = useMutation({
    mutationFn: (weekly: WeeklyHours) => updateBusinessHours(weekly),
    onSuccess: (state) => {
      queryClient.setQueryData(['business-hours'], state)
      // El texto del horario tambien lo leen la carta, el menu digital y los enlaces.
      queryClient.invalidateQueries({ queryKey: ['reservation-settings'] })
      queryClient.invalidateQueries({ queryKey: ['store-settings'] })
      queryClient.invalidateQueries({ queryKey: ['link-page'] })
    },
  })

  return { settingsQuery, hoursQuery, saveRules, saveHours }
}
