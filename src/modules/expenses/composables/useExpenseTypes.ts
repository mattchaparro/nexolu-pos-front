import { useQuery } from '@tanstack/vue-query'

import { fetchExpenseTypes } from '../services/expenseService'

export function useExpenseTypes() {
  return useQuery({
    queryKey: ['expense-types'],
    queryFn: fetchExpenseTypes,
    staleTime: 5 * 60 * 1000,
  })
}
