import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchAnnualReport, fetchClosings, fetchMonthlyReport } from '../services/accountingService'

export function useMonthlyReport(year: Ref<number>, month: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['accounting-monthly', year.value, month.value]),
    queryFn: () => fetchMonthlyReport(year.value, month.value),
  })
}

export function useAnnualReport(year: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['accounting-annual', year.value]),
    queryFn: () => fetchAnnualReport(year.value),
  })
}

export function useAccountingClosings() {
  return useQuery({
    queryKey: ['accounting-closings'],
    queryFn: fetchClosings,
  })
}
