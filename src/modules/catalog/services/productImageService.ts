import { httpClient } from '@/services/http/client'
import type { ProductImage } from '@/types/product'

// Las fotos no viajan anidadas en el payload del producto (a diferencia de
// las variantes): son archivos, van por multipart y se suben de a una en
// cuanto el comerciante las elige, sin esperar a guardar el formulario.

export async function fetchProductImages(productId: number): Promise<ProductImage[]> {
  const { data } = await httpClient.get<ProductImage[]>(`/products/${productId}/images`)
  return data
}

export async function uploadProductImage(
  productId: number,
  file: File,
  options: { variantId?: number | null; alt?: string | null } = {},
): Promise<ProductImage> {
  const form = new FormData()
  form.append('image', file)
  if (options.variantId) {
    form.append('product_variant_id', String(options.variantId))
  }
  if (options.alt) {
    form.append('alt', options.alt)
  }

  // Sin Content-Type explicito a proposito: el navegador tiene que ponerlo
  // el mismo para incluir el boundary del multipart.
  const { data } = await httpClient.post<ProductImage>(`/products/${productId}/images`, form)
  return data
}

// Reasigna una foto a otra variante (null = del producto) o cambia su texto
// alternativo. Al crear un producto las variantes no tienen id todavia, asi
// que corregir el destino de una foto solo es posible despues.
export async function updateProductImage(
  productId: number,
  imageId: number,
  payload: { product_variant_id?: number | null; alt?: string | null },
): Promise<ProductImage> {
  const { data } = await httpClient.patch<ProductImage>(`/products/${productId}/images/${imageId}`, payload)
  return data
}

export async function deleteProductImage(productId: number, imageId: number): Promise<void> {
  await httpClient.delete(`/products/${productId}/images/${imageId}`)
}

export async function reorderProductImages(productId: number, imageIds: number[]): Promise<ProductImage[]> {
  const { data } = await httpClient.put<ProductImage[]>(`/products/${productId}/images/order`, {
    image_ids: imageIds,
  })
  return data
}
