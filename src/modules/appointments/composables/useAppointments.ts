import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchAppointments } from '../services/appointmentService'

// Rango de fechas = el dia/semana/mes visible en el calendario, no un
// filtro de busqueda - por eso no hay "page". perPage sube del default de
// 50 solo para la vista de mes (ver AgendaView.vue), que puede tener mas
// de 50 citas en el rango.
export function useAppointments(from: Ref<string>, to: Ref<string>, perPage: Ref<number> | number = 50) {
  const perPageValue = computed(() => (typeof perPage === 'number' ? perPage : perPage.value))

  return useQuery({
    queryKey: computed(() => ['appointments', from.value, to.value, perPageValue.value] as const),
    queryFn: () => fetchAppointments({ from: from.value, to: to.value, per_page: perPageValue.value }),
    placeholderData: keepPreviousData,
  })
}
