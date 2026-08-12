import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { BulkUpdateIngredientItem, BulkUpdateProductItem } from '@/types/bulkStockUpdate'

import { bulkUpdateIngredients, bulkUpdateProducts } from '../services/bulkStockUpdateService'

export function useBulkStockUpdate() {
  const queryClient = useQueryClient()

  const productsMutation = useMutation({
    mutationFn: ({ items, notes }: { items: BulkUpdateProductItem[]; notes?: string }) =>
      bulkUpdateProducts(items, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const ingredientsMutation = useMutation({
    mutationFn: ({ items, notes }: { items: BulkUpdateIngredientItem[]; notes?: string }) =>
      bulkUpdateIngredients(items, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })

  return { productsMutation, ingredientsMutation }
}
