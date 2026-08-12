import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { ProductStockFilter } from '@/types/catalogSummary'

import { fetchProducts } from '../services/catalogService'

const PRODUCTS_PER_PAGE = 20

// queryKey reactivo (search/page/categoria/filtro como refs, no valores
// planos) - TanStack Query re-consulta solo cuando alguno cambia.
// `keepPreviousData` evita el parpadeo a "cargando" al pasar de pagina (se
// ve la pagina anterior hasta que llega la nueva).
//
// is_service=false: la pestaña "Productos" del Catalogo nunca mezcla
// servicios (igual que Admin\InventoryController del legacy) - los
// servicios viven en su propia pestaña, ver useServices().
export function useProducts(
  search: Ref<string>,
  page: Ref<number>,
  categoryId: Ref<number | null>,
  filter: Ref<ProductStockFilter | null>,
) {
  return useQuery({
    queryKey: computed(() => ['products', 'admin', search.value, page.value, categoryId.value, filter.value] as const),
    queryFn: () =>
      fetchProducts({
        search: search.value || undefined,
        page: page.value,
        per_page: PRODUCTS_PER_PAGE,
        is_service: false,
        category_id: categoryId.value ?? undefined,
        filter: filter.value ?? undefined,
      }),
    placeholderData: keepPreviousData,
  })
}

// Misma paginacion, pero solo servicios (is_service=true) - pestaña
// "Servicios". queryKey anidado bajo ['products','admin',...] a proposito:
// useProductMutations() invalida por ese prefijo, y TanStack matchea por
// prefijo de array, asi que un servicio creado/editado/eliminado tambien
// refresca este listado sin tener que tocar esa invalidacion.
export function useServices(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['products', 'admin', 'services', search.value, page.value] as const),
    queryFn: () =>
      fetchProducts({ search: search.value || undefined, page: page.value, per_page: PRODUCTS_PER_PAGE, is_service: true }),
    placeholderData: keepPreviousData,
  })
}
