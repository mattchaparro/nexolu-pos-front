import { useQuery } from '@tanstack/vue-query'
import { type ComputedRef } from 'vue'

import { fetchProductAttributes } from '../services/catalogService'

// /product-attributes esta detras de middleware('feature:variants') - solo
// se pide si el negocio tiene la feature activa (`enabled`), mismo criterio
// que useIngredientOptions. Sin paginar, un solo hook sirve tanto para la
// pantalla de gestion (ProductAttributesView) como para el selector de
// atributos del editor de variantes (ProductVariantsEditor) - igual que
// useCategories sirve al listado de Categorias y al selector del formulario
// de producto.
export function useProductAttributes(enabled: ComputedRef<boolean>) {
  return useQuery({
    queryKey: ['product-attributes'],
    queryFn: fetchProductAttributes,
    enabled,
  })
}
