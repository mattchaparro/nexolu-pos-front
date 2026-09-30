import { ref } from 'vue'

import type { IngredientStockFilter, ProductStockFilter } from '@/types/catalogSummary'

// Estado de los listados a nivel de modulo (no dentro del componente) para
// que sobreviva a entrar a editar un producto y volver: la vista se destruye
// al navegar, y los filtros/pagina se perdian.
export const activeArticleTab = ref<'productos' | 'ingredientes'>('productos')

export const productSearchInput = ref('')
export const productSearch = ref('')
export const productPage = ref(1)
export const productCategoryId = ref<number | null>(null)
export const productFilter = ref<ProductStockFilter | null>(null)

export const ingredientSearchInput = ref('')
export const ingredientSearch = ref('')
export const ingredientPage = ref(1)
export const ingredientFilter = ref<IngredientStockFilter | null>(null)

export const servicesSearchInput = ref('')
export const servicesSearch = ref('')
export const servicesPage = ref(1)
