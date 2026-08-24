<script setup lang="ts">
// Hub de Catalogo (tab "Articulos"). Productos e Ingredientes son sub-tabs
// de un mismo nivel aca - Categorias NO vive aca, es su propia pagina de
// nivel superior junto a Compras/Servicios/Proveedores (ver
// CatalogHubTabs y CategoriesView), igual que el legacy.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { usePermissions } from '@/composables/usePermissions'
import type { IngredientStockFilter, ProductStockFilter } from '@/types/catalogSummary'
import type { StockMovementType } from '@/types/inventory'
import type { Ingredient, Product } from '@/types/product'
import {
  NxButton,
  NxColumn,
  NxDataTable,
  NxInput,
  NxModal,
  NxPageHeader,
  NxSelect,
  NxStatCard,
  NxTab,
  NxTabList,
  NxTabPanel,
  NxTabPanels,
  NxTabs,
} from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import CatalogHubTabs from '../components/CatalogHubTabs.vue'
import IngredientFormModal from '../components/IngredientFormModal.vue'
import StockMovementModal, { type StockSubject } from '../components/StockMovementModal.vue'
import { useCategories } from '../composables/useCategories'
import { useIngredientsSummary, useProductsSummary } from '../composables/useCatalogSummary'
import { useIngredientMutations } from '../composables/useIngredientMutations'
import { useIngredients } from '../composables/useIngredients'
import { useProductMutations } from '../composables/useProductMutations'
import { useProducts } from '../composables/useProducts'
import { ingredientStockBadge, productStockBadge } from '../support/stockBadge'

const router = useRouter()
const { data: business } = useBusiness()
const { hasPermission } = usePermissions()
const ingredientsEnabled = computed(() => business.value?.feature_flags?.ingredients === true)
const canAdd = computed(() => hasPermission('inventory.add'))
const canAdjust = computed(() => hasPermission('inventory.adjust'))

const activeArticleTab = ref<'productos' | 'ingredientes'>('productos')

// --- Productos ---
const productSearchInput = ref('')
const productSearch = ref('')
const productPage = ref(1)
let productDebounce: number | undefined

watch(productSearchInput, (value) => {
  window.clearTimeout(productDebounce)
  productDebounce = window.setTimeout(() => {
    productSearch.value = value
    productPage.value = 1
  }, 300)
})

// category_id: puerto directo de Admin\InventoryController del legacy.
// filter (sin stock/inventario bajo/inactivos/venta unica/receta): no
// existe como filtro real en legacy (solo como cards de resumen de solo
// lectura, ver ProductController::summary()) - se agrega aca a pedido
// explicito, no es un puerto.
const categoriesQuery = useCategories()
const productCategoryId = ref<number | null>(null)
const productFilter = ref<ProductStockFilter | null>(null)

const categoryOptions = computed(() => {
  const all = categoriesQuery.data.value ?? []
  return [
    { id: null, label: 'Todas las categorías' },
    ...all.map((c) => ({
      id: c.id,
      label: c.parent_id ? `${all.find((p) => p.id === c.parent_id)?.name ?? ''} › ${c.name}` : c.name,
    })),
  ]
})

function toggleProductFilter(filter: ProductStockFilter): void {
  productFilter.value = productFilter.value === filter ? null : filter
  productPage.value = 1
}

function onProductFilterSelect(value: unknown): void {
  productFilter.value = value as ProductStockFilter | null
  productPage.value = 1
}

watch(productCategoryId, () => {
  productPage.value = 1
})

// Colapsable: en negocios con muchas cards de resumen (venta unica, con
// receta, valor de inventario) el buscador quedaba empujado varias filas
// mas abajo - se puede ocultar sin perder la capacidad de filtrar (el
// filtro real vive en productFilter, no en que las cards esten visibles).
const showProductsSummary = ref(true)
const showIngredientsSummary = ref(true)

const productFilterOptions = computed(() => {
  const options: { label: string; value: ProductStockFilter | null }[] = [
    { label: 'Todos', value: null },
    { label: 'Inventario bajo', value: 'low_stock' },
    { label: 'Sin stock', value: 'out_of_stock' },
    { label: 'Inactivos', value: 'inactive' },
    { label: 'Venta única', value: 'single_sale' },
  ]
  if (ingredientsEnabled.value) {
    options.push({ label: 'Con receta', value: 'recipe' })
  }
  return options
})

const productsQuery = useProducts(productSearch, productPage, productCategoryId, productFilter)
const { deleteMutation: deleteProductMutation, duplicateMutation: duplicateProductMutation } = useProductMutations()
const productMeta = computed(() => productsQuery.data.value?.meta)
const productsSummaryQuery = useProductsSummary()

async function removeProduct(product: Product): Promise<void> {
  if (!window.confirm(`¿Eliminar "${product.name}"?`)) {
    return
  }
  try {
    await deleteProductMutation.mutateAsync(product.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el producto.'))
  }
}

async function duplicateProductRow(product: Product): Promise<void> {
  try {
    await duplicateProductMutation.mutateAsync(product.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos duplicar el producto.'))
  }
}

function onProductPage(event: { page: number }): void {
  productPage.value = event.page + 1
}

// --- Ingredientes ---
const ingredientSearchInput = ref('')
const ingredientSearch = ref('')
const ingredientPage = ref(1)
let ingredientDebounce: number | undefined

watch(ingredientSearchInput, (value) => {
  window.clearTimeout(ingredientDebounce)
  ingredientDebounce = window.setTimeout(() => {
    ingredientSearch.value = value
    ingredientPage.value = 1
  }, 300)
})

const ingredientFilter = ref<IngredientStockFilter | null>(null)

function toggleIngredientFilter(filter: IngredientStockFilter): void {
  ingredientFilter.value = ingredientFilter.value === filter ? null : filter
  ingredientPage.value = 1
}

function onIngredientFilterSelect(value: unknown): void {
  ingredientFilter.value = value as IngredientStockFilter | null
  ingredientPage.value = 1
}

const ingredientFilterOptions: { label: string; value: IngredientStockFilter | null }[] = [
  { label: 'Todos', value: null },
  { label: 'Bajo mínimo', value: 'low_stock' },
  { label: 'Sin stock', value: 'out_of_stock' },
  { label: 'Inactivos', value: 'inactive' },
]

const ingredientsQuery = useIngredients(
  ingredientSearch,
  ingredientPage,
  computed(() => ingredientsEnabled.value && activeArticleTab.value === 'ingredientes'),
  ingredientFilter,
)
const { deleteMutation: deleteIngredientMutation } = useIngredientMutations()
const ingredientMeta = computed(() => ingredientsQuery.data.value?.meta)
const ingredientsSummaryQuery = useIngredientsSummary(
  computed(() => activeArticleTab.value === 'ingredientes'),
)

const ingredientModalOpen = ref(false)
const editingIngredient = ref<Ingredient | null>(null)

function openNewIngredient(): void {
  editingIngredient.value = null
  ingredientModalOpen.value = true
}

function openEditIngredient(ingredient: Ingredient): void {
  editingIngredient.value = ingredient
  ingredientModalOpen.value = true
}

async function removeIngredient(ingredient: Ingredient): Promise<void> {
  if (!window.confirm(`¿Eliminar "${ingredient.name}"?`)) {
    return
  }
  try {
    await deleteIngredientMutation.mutateAsync(ingredient.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el insumo.'))
  }
}

function onIngredientPage(event: { page: number }): void {
  ingredientPage.value = event.page + 1
}

// --- Ajustar stock (productos e insumos) ---
const stockModalOpen = ref(false)
const stockSubject = ref<StockSubject | null>(null)
const stockInitialType = ref<StockMovementType>('entry')

function openStockModal(subject: StockSubject, initialType: StockMovementType = 'entry'): void {
  stockSubject.value = subject
  stockInitialType.value = initialType
  stockModalOpen.value = true
}

// --- "Platos que usan este ingrediente" (puerto del modal de legacy) ---
const usedInModalIngredient = ref<Ingredient | null>(null)
</script>

<template>
  <div class="flex flex-col pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Catálogo" icon="pi pi-shop" compact />
      <div class="flex items-center gap-2">
        <NxButton
          v-if="canAdjust"
          variant="outline"
          icon="pi pi-table"
          @click="router.push({ name: 'catalog.bulk-update' })"
        >
          Edición masiva
        </NxButton>
        <NxButton
          v-if="canAdd && activeArticleTab === 'productos'"
          icon="pi pi-plus"
          @click="router.push({ name: 'catalog.products.create' })"
        >
          Producto
        </NxButton>
        <NxButton v-else-if="canAdd" icon="pi pi-plus" @click="openNewIngredient">Insumo</NxButton>
      </div>
    </div>

    <CatalogHubTabs class="mt-3" />

    <NxTabs v-model:value="activeArticleTab" class="mt-4">
      <NxTabList>
        <NxTab value="productos" icon="pi pi-box">Productos</NxTab>
        <NxTab v-if="ingredientsEnabled" value="ingredientes" icon="pi pi-shopping-bag"
          >Ingredientes</NxTab
        >
      </NxTabList>
      <NxTabPanels>
        <NxTabPanel value="productos">
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Resumen</p>
              <button
                type="button"
                class="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                @click="showProductsSummary = !showProductsSummary"
              >
                {{ showProductsSummary ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <div v-if="showProductsSummary" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <NxStatCard
                v-if="productMeta"
                label="Total de productos"
                :value="String(productMeta.total)"
                icon="pi pi-box"
              />
              <template v-if="productsSummaryQuery.data.value">
                <NxStatCard
                  label="Inventario bajo"
                  :value="String(productsSummaryQuery.data.value.low_stock_count)"
                  icon="pi pi-exclamation-triangle"
                  clickable
                  :active="productFilter === 'low_stock'"
                  @click="toggleProductFilter('low_stock')"
                />
                <NxStatCard
                  label="Sin stock"
                  :value="String(productsSummaryQuery.data.value.out_of_stock_count)"
                  icon="pi pi-ban"
                  clickable
                  :active="productFilter === 'out_of_stock'"
                  @click="toggleProductFilter('out_of_stock')"
                />
                <NxStatCard
                  label="Inactivos"
                  :value="String(productsSummaryQuery.data.value.inactive_count)"
                  icon="pi pi-eye-slash"
                  clickable
                  :active="productFilter === 'inactive'"
                  @click="toggleProductFilter('inactive')"
                />
                <NxStatCard
                  label="Venta única"
                  :value="String(productsSummaryQuery.data.value.single_sale_count)"
                  icon="pi pi-bolt"
                  clickable
                  :active="productFilter === 'single_sale'"
                  @click="toggleProductFilter('single_sale')"
                />
                <NxStatCard
                  v-if="ingredientsEnabled"
                  label="Con receta"
                  :value="String(productsSummaryQuery.data.value.with_recipe_count)"
                  icon="pi pi-book"
                  clickable
                  :active="productFilter === 'recipe'"
                  @click="toggleProductFilter('recipe')"
                />
                <NxStatCard
                  v-if="productsSummaryQuery.data.value.show_inventory_value_card"
                  label="Valor inventario"
                  :value="formatCop(productsSummaryQuery.data.value.inventory_value_cop ?? 0)"
                  icon="pi pi-wallet"
                />
              </template>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <NxInput
                v-model="productSearchInput"
                label="Buscar producto o SKU"
                size="lg"
                icon="pi pi-search"
                clearable
                blur-after-typing
                class="flex-1"
              />
              <NxSelect
                v-model="productCategoryId"
                :options="categoryOptions"
                option-label="label"
                option-value="id"
                label="Categoría"
                size="lg"
                filter
                class="sm:w-64"
              />
              <NxSelect
                :model-value="productFilter"
                :options="productFilterOptions"
                option-label="label"
                option-value="value"
                label="Estado"
                size="lg"
                class="sm:w-48"
                @update:model-value="onProductFilterSelect"
              />
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <NxDataTable
                :value="productsQuery.data.value?.data ?? []"
                :loading="productsQuery.isPending.value"
                paginator
                lazy
                :rows="20"
                :total-records="productMeta?.total ?? 0"
                :first="((productMeta?.current_page ?? 1) - 1) * 20"
                @page="onProductPage"
              >
                <template #empty>
                  <p class="py-6 text-center text-sm text-slate-400">
                    {{
                      productSearch
                        ? 'Sin resultados para tu búsqueda.'
                        : 'Todavía no hay productos.'
                    }}
                  </p>
                </template>
                <NxColumn header="Producto">
                  <template #body="{ data }: { data: Product }">
                    <div class="flex flex-col gap-2 py-1">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex min-w-0 items-center gap-2">
                          <span
                            class="material-icons shrink-0 rounded-lg bg-indigo-50 p-1.5 text-base text-indigo-600"
                          >
                            {{ data.category?.icon || 'inventory_2' }}
                          </span>
                          <div class="min-w-0">
                            <p
                              class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold text-slate-900"
                            >
                              <span class="truncate">{{ data.name }}</span>
                              <span
                                v-if="!data.is_active"
                                class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
                              >
                                Inactivo
                              </span>
                              <span
                                v-if="data.is_single_sale"
                                class="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] leading-none font-medium whitespace-nowrap text-amber-700"
                                title="Venta única: una sola unidad en inventario"
                              >
                                Venta única
                              </span>
                              <span
                                v-if="data.has_recipe"
                                class="rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5 text-[10px] font-medium text-indigo-600"
                                title="Descuenta inventario desde ingredientes de receta"
                              >
                                Receta
                              </span>
                            </p>
                            <p class="truncate text-xs text-slate-400">
                              {{ data.category?.name ?? 'Sin categoría' }}
                              {{ data.price_varies_at_sale ? 'Variable' : formatCop(data.price) }}
                              <span v-if="data.cost_price">· costo: {{ formatCop(data.cost_price) }}</span>
                            </p>
                          </div>
                        </div>
                        <div class="shrink-0 text-right">
                          <span
                            :class="productStockBadge(data).class"
                            class="rounded-md px-2 py-1 text-xs font-semibold"
                          >
                            {{ productStockBadge(data).label }}
                          </span>
                          <p v-if="data.low_stock_alert_threshold" class="mt-0.5 text-[10px] whitespace-nowrap text-slate-400">
                            umbral: {{ data.low_stock_alert_threshold }}
                          </p>
                        </div>
                      </div>

                      <div class="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-100 pt-2 sm:gap-x-8">
                        <template v-if="data.track_stock && !data.is_service && data.can_manage_stock">
                          <button
                            v-if="canAdjust"
                            type="button"
                            class="flex flex-col items-center gap-0.5 px-1 text-emerald-600 hover:text-emerald-700"
                            @click="
                              openStockModal(
                                { kind: 'product', id: data.id, name: data.name, stock: data.stock },
                                'entry',
                              )
                            "
                          >
                            <i class="pi pi-plus-circle" style="font-size: 1.125rem" />
                            <span class="text-[11px] font-medium">Agregar</span>
                          </button>
                          <button
                            v-if="canAdjust"
                            type="button"
                            class="flex flex-col items-center gap-0.5 px-1 text-red-500 hover:text-red-700"
                            @click="
                              openStockModal(
                                { kind: 'product', id: data.id, name: data.name, stock: data.stock },
                                'exit',
                              )
                            "
                          >
                            <i class="pi pi-minus-circle" style="font-size: 1.125rem" />
                            <span class="text-[11px] font-medium">Retirar</span>
                          </button>
                          <button
                            v-if="canAdjust"
                            type="button"
                            class="flex flex-col items-center gap-0.5 px-1 text-indigo-600 hover:text-indigo-700"
                            @click="
                              openStockModal(
                                { kind: 'product', id: data.id, name: data.name, stock: data.stock },
                                'adjustment',
                              )
                            "
                          >
                            <i class="pi pi-sliders-h" style="font-size: 1.125rem" />
                            <span class="text-[11px] font-medium">Ajustar</span>
                          </button>
                          <RouterLink
                            :to="{ name: 'catalog.products.stock-history', params: { id: data.id } }"
                            class="flex flex-col items-center gap-0.5 px-1 text-slate-400 hover:text-indigo-600"
                          >
                            <i class="pi pi-history" style="font-size: 1.125rem" />
                            <span class="text-[11px] font-medium">Historial</span>
                          </RouterLink>
                        </template>
                        <RouterLink
                          v-if="canAdd"
                          :to="{ name: 'catalog.products.edit', params: { id: data.id } }"
                          class="flex flex-col items-center gap-0.5 px-1 text-indigo-600 hover:text-indigo-700"
                        >
                          <i class="pi pi-pencil" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Editar</span>
                        </RouterLink>
                        <button
                          v-if="canAdd"
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-slate-400 hover:text-indigo-600"
                          :disabled="duplicateProductMutation.isPending.value"
                          @click="duplicateProductRow(data)"
                        >
                          <i class="pi pi-copy" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Duplicar</span>
                        </button>
                        <button
                          v-if="canAdd"
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-red-500 hover:text-red-700"
                          :disabled="deleteProductMutation.isPending.value"
                          @click="removeProduct(data)"
                        >
                          <i class="pi pi-trash" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </template>
                </NxColumn>
              </NxDataTable>
            </div>
          </div>
        </NxTabPanel>

        <NxTabPanel v-if="ingredientsEnabled" value="ingredientes">
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Resumen</p>
              <button
                type="button"
                class="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                @click="showIngredientsSummary = !showIngredientsSummary"
              >
                {{ showIngredientsSummary ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <div v-if="showIngredientsSummary" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <NxStatCard
                v-if="ingredientMeta"
                label="Total de insumos"
                :value="String(ingredientMeta.total)"
                icon="pi pi-shopping-bag"
              />
              <template v-if="ingredientsSummaryQuery.data.value">
                <NxStatCard
                  label="Activos"
                  :value="String(ingredientsSummaryQuery.data.value.active_count)"
                  icon="pi pi-check-circle"
                />
                <NxStatCard
                  label="Bajo mínimo"
                  :value="String(ingredientsSummaryQuery.data.value.low_stock_count)"
                  icon="pi pi-exclamation-triangle"
                  clickable
                  :active="ingredientFilter === 'low_stock'"
                  @click="toggleIngredientFilter('low_stock')"
                />
                <NxStatCard
                  label="Sin stock"
                  :value="String(ingredientsSummaryQuery.data.value.out_of_stock_count)"
                  icon="pi pi-ban"
                  clickable
                  :active="ingredientFilter === 'out_of_stock'"
                  @click="toggleIngredientFilter('out_of_stock')"
                />
                <NxStatCard
                  label="Inactivos"
                  :value="String(ingredientsSummaryQuery.data.value.inactive_count)"
                  icon="pi pi-eye-slash"
                  clickable
                  :active="ingredientFilter === 'inactive'"
                  @click="toggleIngredientFilter('inactive')"
                />
              </template>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <NxInput
                v-model="ingredientSearchInput"
                label="Buscar insumo"
                size="lg"
                icon="pi pi-search"
                clearable
                blur-after-typing
                class="flex-1"
              />
              <NxSelect
                :model-value="ingredientFilter"
                :options="ingredientFilterOptions"
                option-label="label"
                option-value="value"
                label="Estado"
                size="lg"
                class="sm:w-48"
                @update:model-value="onIngredientFilterSelect"
              />
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <NxDataTable
                :value="ingredientsQuery.data.value?.data ?? []"
                :loading="ingredientsQuery.isPending.value"
                paginator
                lazy
                :rows="20"
                :total-records="ingredientMeta?.total ?? 0"
                :first="((ingredientMeta?.current_page ?? 1) - 1) * 20"
                @page="onIngredientPage"
              >
                <template #empty>
                  <p class="py-6 text-center text-sm text-slate-400">
                    {{
                      ingredientSearch
                        ? 'Sin resultados para tu búsqueda.'
                        : 'Todavía no hay insumos.'
                    }}
                  </p>
                </template>
                <NxColumn header="Insumo">
                  <template #body="{ data }: { data: Ingredient }">
                    <div class="flex flex-col gap-2 py-1">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-sm font-semibold text-slate-900">
                            {{ data.name }}
                            <span
                              v-if="!data.is_active"
                              class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
                            >
                              Inactivo
                            </span>
                          </p>
                          <p class="truncate text-xs text-slate-400">
                            {{ data.unit }}
                            <span v-if="data.cost_price != null"> · costo: {{ formatCop(Number(data.cost_price)) }}</span>
                          </p>
                        </div>
                        <div class="shrink-0 text-right">
                          <span
                            :class="ingredientStockBadge(data).class"
                            class="rounded-md px-2 py-1 text-xs font-semibold"
                          >
                            {{ ingredientStockBadge(data).label }}
                          </span>
                          <p v-if="data.min_stock" class="mt-0.5 text-[10px] whitespace-nowrap text-slate-400">
                            umbral: {{ data.min_stock }}
                          </p>
                        </div>
                      </div>

                      <div class="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-100 pt-2 sm:gap-x-8">
                        <button
                          v-if="canAdjust"
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-emerald-600 hover:text-emerald-700"
                          @click="
                            openStockModal(
                              {
                                kind: 'ingredient',
                                id: data.id,
                                name: data.name,
                                stock: Number(data.stock),
                                unit: data.unit,
                              },
                              'entry',
                            )
                          "
                        >
                          <i class="pi pi-plus-circle" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Agregar</span>
                        </button>
                        <button
                          v-if="canAdjust"
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-red-500 hover:text-red-700"
                          @click="
                            openStockModal(
                              {
                                kind: 'ingredient',
                                id: data.id,
                                name: data.name,
                                stock: Number(data.stock),
                                unit: data.unit,
                              },
                              'exit',
                            )
                          "
                        >
                          <i class="pi pi-minus-circle" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Retirar</span>
                        </button>
                        <button
                          v-if="canAdjust"
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-indigo-600 hover:text-indigo-700"
                          @click="
                            openStockModal(
                              {
                                kind: 'ingredient',
                                id: data.id,
                                name: data.name,
                                stock: Number(data.stock),
                                unit: data.unit,
                              },
                              'adjustment',
                            )
                          "
                        >
                          <i class="pi pi-sliders-h" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Ajustar</span>
                        </button>
                        <RouterLink
                          :to="{ name: 'catalog.ingredients.stock-history', params: { id: data.id } }"
                          class="flex flex-col items-center gap-0.5 px-1 text-slate-400 hover:text-indigo-600"
                        >
                          <i class="pi pi-history" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Historial</span>
                        </RouterLink>
                        <button
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-amber-600 hover:text-amber-700"
                          @click="usedInModalIngredient = data"
                        >
                          <i class="pi pi-book" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Platos</span>
                        </button>
                        <button
                          v-if="canAdd"
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-indigo-600 hover:text-indigo-700"
                          @click="openEditIngredient(data)"
                        >
                          <i class="pi pi-pencil" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Editar</span>
                        </button>
                        <button
                          v-if="canAdd"
                          type="button"
                          class="flex flex-col items-center gap-0.5 px-1 text-red-500 hover:text-red-700"
                          :disabled="deleteIngredientMutation.isPending.value"
                          @click="removeIngredient(data)"
                        >
                          <i class="pi pi-trash" style="font-size: 1.125rem" />
                          <span class="text-[11px] font-medium">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </template>
                </NxColumn>
              </NxDataTable>
            </div>
          </div>
        </NxTabPanel>
      </NxTabPanels>
    </NxTabs>

    <IngredientFormModal v-model="ingredientModalOpen" :ingredient="editingIngredient" />
    <StockMovementModal
      v-model="stockModalOpen"
      :subject="stockSubject"
      :initial-type="stockInitialType"
    />

    <NxModal
      :model-value="usedInModalIngredient !== null"
      :title="usedInModalIngredient?.name"
      size="sm"
      @update:model-value="usedInModalIngredient = null"
    >
      <p class="-mt-2 mb-3 text-xs text-slate-500">Platos y productos que usan este ingrediente</p>
      <ul v-if="usedInModalIngredient?.products?.length" class="divide-y divide-slate-100">
        <li
          v-for="p in usedInModalIngredient.products"
          :key="p.id"
          class="flex items-center gap-2 py-2.5 text-sm text-slate-800"
        >
          <i class="pi pi-box shrink-0 text-orange-400" />
          {{ p.name }}
        </li>
      </ul>
      <p v-else class="py-4 text-center text-sm text-slate-400">
        Este ingrediente no está en ninguna receta todavía.
      </p>
    </NxModal>
  </div>
</template>
