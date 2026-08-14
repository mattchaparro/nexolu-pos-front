import { useQuery } from '@tanstack/vue-query'

import { fetchFixedExpenseTemplates } from '../services/expenseService'

export function useFixedExpenseTemplates() {
  return useQuery({
    queryKey: ['fixed-expense-templates'],
    queryFn: fetchFixedExpenseTemplates,
  })
}
