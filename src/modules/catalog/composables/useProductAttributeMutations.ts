import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ProductAttributePayload } from '@/types/product'

import {
  createProductAttribute,
  deleteProductAttribute,
  updateProductAttribute,
} from '../services/catalogService'

export function useProductAttributeMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product-attributes'] })

  const createMutation = useMutation({
    mutationFn: createProductAttribute,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<ProductAttributePayload> }) =>
      updateProductAttribute(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProductAttribute,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
