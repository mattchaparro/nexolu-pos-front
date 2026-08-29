import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ProductPayload } from '@/types/product'

import {
  createProduct,
  deleteProduct,
  duplicateProduct,
  toggleProductVariant,
  updateProduct,
} from '../services/catalogService'

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
    queryClient.invalidateQueries({ queryKey: ['products', 'services-summary'] })
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

  const duplicateMutation = useMutation({
    mutationFn: duplicateProduct,
    onSuccess: invalidate,
  })

  // Atajo de pausar/activar desde el listado. Va por el update normal con un
  // payload de un solo campo: ProductService::update solo sincroniza
  // variantes y receta si esas claves VIENEN en la request, asi que un
  // parcial no toca ninguna de las dos.
  const toggleActiveMutation = useMutation({
    mutationFn: (params: { id: number; isActive: boolean }) =>
      updateProduct(params.id, { is_active: !params.isActive }),
    onSuccess: invalidate,
  })

  // Publicar en la tienda es independiente de estar activo en el POS: hacen
  // falta los dos para que un producto se vea en internet.
  const togglePublishedMutation = useMutation({
    mutationFn: (params: { id: number; isPublished: boolean }) =>
      updateProduct(params.id, { is_published: !params.isPublished }),
    onSuccess: () => {
      invalidate()
      // El contador de "productos publicados" del panel de la tienda.
      queryClient.invalidateQueries({ queryKey: ['store-settings'] })
    },
  })

  const toggleVariantMutation = useMutation({
    mutationFn: (params: { productId: number; variantId: number }) =>
      toggleProductVariant(params.productId, params.variantId),
    onSuccess: invalidate,
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    duplicateMutation,
    toggleActiveMutation,
    togglePublishedMutation,
    toggleVariantMutation,
  }
}
