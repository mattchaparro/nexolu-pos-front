import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchCashClosingPreview, fetchCashClosings, fetchPendingCashClosingDates } from '../services/cashShiftService'

/** La cola de dias con actividad sin cerrar - lo que guia al dueño a ponerse al dia en orden. */
export function usePendingClosingDates() {
  return useQuery({
    queryKey: ['cash-closings', 'pending-dates'],
    queryFn: fetchPendingCashClosingDates,
  })
}

export function useCashClosingPreview(date: Ref<string>, openingCash: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['cash-closings', 'preview', date.value, openingCash.value] as const),
    queryFn: () => fetchCashClosingPreview(date.value, openingCash.value),
    placeholderData: keepPreviousData,
  })
}

export function useCashClosingHistory(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['cash-closings', 'history', page.value] as const),
    queryFn: () => fetchCashClosings({ page: page.value }),
    placeholderData: keepPreviousData,
  })
}
