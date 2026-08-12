import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { IngredientPayload } from '@/types/product'

import { createIngredient, deleteIngredient, updateIngredient } from '../services/catalogService'

export function useIngredientMutations() {
  const queryClient = useQueryClient()
  // Invalida el listado admin y el picker de receta del formulario de
  // producto (ver ProductIngredientsEditor) - un insumo creado/editado/
  // eliminado puede cambiar lo que ese picker ofrece.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ingredients', 'admin'] })
    queryClient.invalidateQueries({ queryKey: ['ingredients', 'options'] })
    queryClient.invalidateQueries({ queryKey: ['ingredients', 'summary'] })
  }

  const createMutation = useMutation({
    mutationFn: createIngredient,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<IngredientPayload> }) =>
      updateIngredient(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteIngredient,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
