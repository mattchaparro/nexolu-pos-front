import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ProductPayload } from '@/types/product'

import { createProduct, deleteProduct, updateProduct } from '../services/catalogService'

export function useProductMutations() {
  const queryClient = useQueryClient()
  // Invalida tanto el listado admin (Catalogo) como el dump completo que
  // usa Vender/Cuentas abiertas para el catalogo de venta (ver
  // sales/services/salesService.ts) - un producto creado/editado/eliminado
  // aca debe reflejarse ahi tambien.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products', 'admin'] })
    queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] })
    queryClient.invalidateQueries({ queryKey: ['products', 'summary'] })
  }

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: Partial<ProductPayload> }) => updateProduct(params.id, params.payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: invalidate,
  })

  return { createMutation, updateMutation, deleteMutation }
}
