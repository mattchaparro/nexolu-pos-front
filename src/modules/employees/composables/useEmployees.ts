import { useQuery } from '@tanstack/vue-query'

import { fetchEmployees } from '../services/employeeService'

export function useEmployees() {
  return useQuery({
    queryKey: ['employees', 'list'] as const,
    queryFn: fetchEmployees,
  })
}
