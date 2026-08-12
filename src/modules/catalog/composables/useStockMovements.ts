import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type ComputedRef, type Ref } from 'vue'

import type { StockMovementPayload } from '@/types/inventory'

import {
  createIngredientStockMovement,
  createProductStockMovement,
  fetchIngredientStockMovements,
  fetchProductStockMovements,
} from '../services/stockMovementService'

export type StockSubjectKind = 'product' | 'ingredient'

const FIRST_PAGE = computed(() => 1)

// Historial + registrar movimiento, para un producto o un insumo segun
// `kind` - mismo modelo StockMovement en el backend para los dos, misma
// composicion aca. `subjectId` null (nada seleccionado, ej. modal cerrado)
// deshabilita la query. `page` es opcional (por defecto la pagina 1, para
// el modal de ajuste rapido que solo muestra "ultimos movimientos") - la
// pagina de historial completo pasa su propio ref paginable.
export function useStockMovements(
  kind: ComputedRef<StockSubjectKind>,
  subjectId: ComputedRef<number | null>,
  page: Ref<number> = FIRST_PAGE,
) {
  const queryClient = useQueryClient()

  const movementsQuery = useQuery({
    queryKey: computed(() => ['stock-movements', kind.value, subjectId.value, page.value] as const),
    queryFn: () =>
      kind.value === 'product'
        ? fetchProductStockMovements(subjectId.value as number, page.value)
        : fetchIngredientStockMovements(subjectId.value as number, page.value),
    enabled: computed(() => subjectId.value !== null),
    placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({
        queryKey: kind.value === 'product' ? ['products', 'summary'] : ['ingredients', 'summary'],
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
