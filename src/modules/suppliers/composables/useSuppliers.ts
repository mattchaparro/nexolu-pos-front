import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchSuppliers } from '../services/supplierService'

// SupplierController::index() pagina fijo en 20 (no acepta per_page) - ver
// backend.
export const SUPPLIERS_PAGE_SIZE = 20

export function useSuppliers(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['suppliers', search.value, page.value] as const),
    queryFn: () => fetchSuppliers({ search: search.value || undefined, page: page.value }),
    placeholderData: keepPreviousData,
  })
}
