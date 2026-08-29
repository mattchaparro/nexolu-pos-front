import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref, unref } from 'vue'

import type { ProductImage } from '@/types/product'

import {
  deleteProductImage,
  fetchProductImages,
  reorderProductImages,
  updateProductImage,
  uploadProductImage,
} from '../services/productImageService'

/**
 * Galeria de fotos de un producto. Query propia y no parte de useProduct()
 * porque las fotos cambian por su cuenta (se suben y se borran de a una sin
 * guardar el formulario) y no queremos refetchear el producto entero en cada
 * una.
 */
export function useProductImages(productId: Ref<number | null>) {
  const queryClient = useQueryClient()
  const queryKey = computed(() => ['product-images', unref(productId)])

  const imagesQuery = useQuery({
    queryKey,
    queryFn: () => fetchProductImages(unref(productId) as number),
    enabled: computed(() => unref(productId) !== null),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKey.value })
    // La foto principal se desnormaliza en products.image, asi que el
    // producto y los listados tambien quedan viejos.
    queryClient.invalidateQueries({ queryKey: ['product', unref(productId)] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const uploadMutation = useMutation({
    mutationFn: (params: { file: File; variantId?: number | null }) =>
      uploadProductImage(unref(productId) as number, params.file, { variantId: params.variantId }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: number) => deleteProductImage(unref(productId) as number, imageId),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (params: { imageId: number; variantId: number | null }) =>
      updateProductImage(unref(productId) as number, params.imageId, { product_variant_id: params.variantId }),
    onSuccess: invalidate,
  })

  const reorderMutation = useMutation({
    mutationFn: (imageIds: number[]) => reorderProductImages(unref(productId) as number, imageIds),
    onSuccess: (images: ProductImage[]) => {
      queryClient.setQueryData(queryKey.value, images)
      invalidate()
    },
  })

  return { imagesQuery, uploadMutation, deleteMutation, updateMutation, reorderMutation }
}
