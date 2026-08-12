import { useQuery } from '@tanstack/vue-query'

import { fetchStockMovementReasons } from '../services/stockMovementService'

// ~10 filas globales fijas (ver StockMovementReasonSeeder) - staleTime
// largo, no cambian en caliente.
export function useStockMovementReasons() {
  return useQuery({
    queryKey: ['stock-movement-reasons'],
    queryFn: fetchStockMovementReasons,
    staleTime: 1000 * 60 * 60,
  })
}
