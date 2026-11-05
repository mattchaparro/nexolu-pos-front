import { useQuery } from '@tanstack/vue-query'

import { fetchProducts } from '@/modules/catalog/services/catalogService'
import { fetchSuppliers } from '@/modules/suppliers/services/supplierService'
import type { Product } from '@/types/product'

// Productos que de verdad se pueden comprar: StorePurchaseRequest rechaza
// venta unica, servicios (no se compra "stock" de un servicio) y productos
// con receta activa (ver PurchaseService::applyProductLine()) - filtrar
// aca de una vez evita que el usuario elija uno invalido solo para
// toparse con el 422.
function isPurchasable(product: Product): boolean {
  if (product.is_single_sale || product.is_service) {
    return false
  }
  const hasRecipe = (product.ingredients?.length ?? 0) > 0
  return !(product.track_stock && hasRecipe)
}

export function usePurchasableProducts() {
  return useQuery({
    queryKey: ['products', 'purchase-options'] as const,
    queryFn: async () => {
      const { data } = await fetchProducts({ per_page: 200, is_service: false })
      return data.filter(isPurchasable)
    },
  })
}

// Hasta 200 proveedores (tope de SupplierController::index): antes eran solo
// los primeros 20 y el resto no aparecia ni en el formulario ni en el filtro.
export function useSupplierOptions() {
  return useQuery({
    queryKey: ['suppliers', 'options'] as const,
    queryFn: async () => {
      const { data } = await fetchSuppliers({ per_page: 200 })
      return data
    },
  })
}
