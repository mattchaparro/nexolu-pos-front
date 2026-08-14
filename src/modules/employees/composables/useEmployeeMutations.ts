import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { UpdateEmployeePayload } from '@/types/employee'

import {
  createEmployee,
  deleteEmployee,
  toggleEmployee,
  updateEmployee,
  updateEmployeePermissions,
} from '../services/employeeService'

export function useEmployeeMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['employees'] })

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: UpdateEmployeePayload }) => updateEmployee(params.id, params.payload),
    onSuccess: invalidate,
  })

  const toggleMutation = useMutation({
    mutationFn: toggleEmployee,
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: invalidate,
  })

  const updatePermissionsMutation = useMutation({
    mutationFn: (params: { id: number; permissions: string[] }) =>
      updateEmployeePermissions(params.id, params.permissions),
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, toggleMutation, deleteMutation, updatePermissionsMutation }
}
