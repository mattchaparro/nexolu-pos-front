import { useQuery } from '@tanstack/vue-query'

import { fetchProducts } from '@/modules/catalog/services/catalogService'
import { fetchSuppliers } from '@/modules/suppliers/services/supplierService'
import type { Product } from '@/types/product'

// Productos que de verdad se pueden comprar: StorePurchaseRequest rechaza
// venta unica y productos con receta activa (ver
// PurchaseService::applyProductLine()) - filtrar aca de una vez evita que
// el usuario elija uno invalido solo para toparse con el 422.
function isPurchasable(product: Product): boolean {
  if (product.is_single_sale) {
    return false
  }
  const hasRecipe = (product.ingredients?.length ?? 0) > 0
  return !(product.track_stock && !product.is_service && hasRecipe)
}

export function usePurchasableProducts() {
  return useQuery({
    queryKey: ['products', 'purchase-options'] as const,
    queryFn: async () => {
      const { data } = await fetchProducts({ per_page: 200 })
      return data.filter(isPurchasable)
    },
  })
}

// SupplierController::index() pagina fijo en 20 (no acepta per_page) - un
// negocio con mas proveedores solo ve los primeros 20 en este picker,
// mismo techo ya aceptado en otros pickers de este modulo.
export function useSupplierOptions() {
  return useQuery({
    queryKey: ['suppliers', 'options'] as const,
    queryFn: async () => {
      const { data } = await fetchSuppliers({})
      return data
    },
  })
}
