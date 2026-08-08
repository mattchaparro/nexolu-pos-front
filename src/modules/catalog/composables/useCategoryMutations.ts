import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ProductCategoryPayload } from '@/types/product'

import { createCategory, deleteCategory, updateCategory } from '../services/catalogService'

export function useCategoryMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product-categories'] })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<ProductCategoryPayload> }) =>
      updateCategory(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
