import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type ComputedRef, type Ref } from 'vue'

import type { StockMovementPayload } from '@/types/inventory'

import {
  createIngredientStockMovement,
  createProductStockMovement,
  createVariantStockMovement,
  fetchIngredientStockMovements,
  fetchProductStockMovements,
  fetchVariantStockMovements,
} from '../services/stockMovementService'

export type StockSubjectKind = 'product' | 'ingredient' | 'variant'

const FIRST_PAGE = computed(() => 1)
const NO_PARENT = computed<number | null>(() => null)

// Historial + registrar movimiento, para un producto, un insumo o una
// variante segun `kind` - mismo modelo StockMovement en el backend para los
// tres, misma composicion aca. `subjectId` null (nada seleccionado, ej. modal
// cerrado) deshabilita la query. `page` es opcional (por defecto la pagina 1,
// para el modal de ajuste rapido que solo muestra "ultimos movimientos") - la
// pagina de historial completo pasa su propio ref paginable.
//
// `parentId` solo lo usa el caso 'variant': el endpoint necesita ademas el
// producto padre, porque product_id apunta siempre a el y el backend lo usa
// para verificar que la variante sea de ese producto.
export function useStockMovements(
  kind: ComputedRef<StockSubjectKind>,
  subjectId: ComputedRef<number | null>,
  page: Ref<number> = FIRST_PAGE,
  parentId: ComputedRef<number | null> = NO_PARENT,
) {
  const queryClient = useQueryClient()

  const movementsQuery = useQuery({
    queryKey: computed(() => ['stock-movements', kind.value, subjectId.value, page.value] as const),
    queryFn: () => {
      const id = subjectId.value as number
      if (kind.value === 'variant') {
        return fetchVariantStockMovements(id, page.value)
      }
      return kind.value === 'product'
        ? fetchProductStockMovements(id, page.value)
        : fetchIngredientStockMovements(id, page.value)
    },
    enabled: computed(() => subjectId.value !== null),
    placeholderData: keepPreviousData,
  })

  const createMutation = useMutation({
    mutationFn: (payload: StockMovementPayload) => {
      const id = subjectId.value as number
      if (kind.value === 'variant') {
        return createVariantStockMovement(parentId.value as number, id, payload)
      }
      return kind.value === 'product'
        ? createProductStockMovement(id, payload)
        : createIngredientStockMovement(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements', kind.value, subjectId.value] })

      if (kind.value === 'ingredient') {
        queryClient.invalidateQueries({ queryKey: ['ingredients', 'admin'] })
        queryClient.invalidateQueries({ queryKey: ['ingredients', 'summary'] })
        queryClient.invalidateQueries({ queryKey: ['ingredients', 'options'] })
        return
      }

      // Una variante vive dentro de su producto: mover su stock cambia el
      // stock agregado que muestra la fila del catalogo, asi que se invalida
      // lo mismo que para un producto.
      queryClient.invalidateQueries({ queryKey: ['products', 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] })
    },
  })

  return { movementsQuery, createMutation }
}
