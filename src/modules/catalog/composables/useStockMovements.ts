import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type ComputedRef } from 'vue'

import type { StockMovementPayload } from '@/types/inventory'

import {
  createIngredientStockMovement,
  createProductStockMovement,
  fetchIngredientStockMovements,
  fetchProductStockMovements,
} from '../services/stockMovementService'

export type StockSubjectKind = 'product' | 'ingredient'

// Historial + registrar movimiento, para un producto o un insumo segun
// `kind` - mismo modelo StockMovement en el backend para los dos, misma
// composicion aca. `subjectId` null (nada seleccionado, ej. modal cerrado)
// deshabilita la query.
export function useStockMovements(kind: ComputedRef<StockSubjectKind>, subjectId: ComputedRef<number | null>) {
  const queryClient = useQueryClient()

  const movementsQuery = useQuery({
    queryKey: computed(() => ['stock-movements', kind.value, subjectId.value] as const),
    queryFn: () =>
      kind.value === 'product'
        ? fetchProductStockMovements(subjectId.value as number)
        : fetchIngredientStockMovements(subjectId.value as number),
    enabled: computed(() => subjectId.value !== null),
  })

  const createMutation = useMutation({
    mutationFn: (payload: StockMovementPayload) =>
      kind.value === 'product'
        ? createProductStockMovement(subjectId.value as number, payload)
        : createIngredientStockMovement(subjectId.value as number, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements', kind.value, subjectId.value] })
      queryClient.invalidateQueries({
        queryKey: kind.value === 'product' ? ['products', 'admin'] : ['ingredients', 'admin'],
      })
      if (kind.value === 'product') {
        queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['ingredients', 'options'] })
      }
    },
  })

  return { movementsQuery, createMutation }
}
