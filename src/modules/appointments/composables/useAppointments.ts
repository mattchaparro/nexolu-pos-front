import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchAppointments } from '../services/appointmentService'

// Rango de fechas = la semana/dia visible en el calendario, no un filtro de
// busqueda - por eso no hay "page": AppointmentController::index pagina
// fijo en 50, mas que suficiente para el rango corto que pide la agenda.
export function useAppointments(from: Ref<string>, to: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['appointments', from.value, to.value] as const),
    queryFn: () => fetchAppointments({ from: from.value, to: to.value }),
    placeholderData: keepPreviousData,
  })
}
