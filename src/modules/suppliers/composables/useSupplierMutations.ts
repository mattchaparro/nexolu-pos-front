import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { RemindSupplierVisitPayload, SupplierPayload } from '@/types/supplier'

import { createSupplier, deleteSupplier, remindSupplierVisit, updateSupplier } from '../services/supplierService'

export function useSupplierMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['suppliers'] })

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<SupplierPayload> }) =>
      updateSupplier(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: invalidate,
  })

  const remindVisitMutation = useMutation({
    mutationFn: (params: { id: number; payload: RemindSupplierVisitPayload }) =>
      remindSupplierVisit(params.id, params.payload),
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation, remindVisitMutation }
}
