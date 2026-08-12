<script setup lang="ts">
// Hub de Catalogo (tab "Articulos"). Productos e Ingredientes son sub-tabs
// de un mismo nivel aca - Categorias NO vive aca, es su propia pagina de
// nivel superior junto a Compras/Servicios/Proveedores (ver
// CatalogHubTabs y CategoriesView), igual que el legacy.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import type { StockMovementType } from '@/types/inventory'
import type { Ingredient, Product } from '@/types/product'
import {
  NxButton,
  NxColumn,
  NxDataTable,
  NxInput,
  NxPageHeader,
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
import { useIngredientsSummary, useProductsSummary } from '../composables/useCatalogSummary'
import { useIngredientMutations } from '../composables/useIngredientMutations'
import { useIngredients } from '../composables/useIngredients'
import { useProductMutations } from '../composables/useProductMutations'
import { useProducts } from '../composables/useProducts'
import { ingredientStockBadge, productStockBadge } from '../support/stockBadge'

const router = useRouter()
const { data: business } = useBusiness()
const ingredientsEnabled = computed(() => business.value?.feature_flags?.ingredients === true)

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

const productsQuery = useProducts(productSearch, productPage)
const { deleteMutation: deleteProductMutation } = useProductMutations()
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

function onProductPage(event: { page: number }): void {
  productPage.value = event.page + 1
}

// --- Ingredientes ---
const ingredientPage = ref(1)
const ingredientsQuery = useIngredients(ingredientPage)
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
</script>

<template>
  <div class="flex flex-col pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Catálogo" icon="pi pi-shop" compact />
      <div class="flex items-center gap-2">
        <NxButton
          variant="outline"
          icon="pi pi-table"
          @click="router.push({ name: 'catalog.bulk-update' })"
        >
          Edición masiva
        </NxButton>
        <NxButton
          v-if="activeArticleTab === 'productos'"
          icon="pi pi-plus"
          @click="router.push({ name: 'catalog.products.create' })"
        >
          Producto
        </NxButton>
        <NxButton v-else icon="pi pi-plus" @click="openNewIngredient">Insumo</NxButton>
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
            <NxInput
              v-model="productSearchInput"
              label="Buscar producto o SKU"
              size="lg"
              icon="pi pi-search"
              clearable
            />
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                />
                <NxStatCard
                  label="Sin stock"
                  :value="String(productsSummaryQuery.data.value.out_of_stock_count)"
                  icon="pi pi-ban"
                />
                <NxStatCard
                  label="Venta única"
                  :value="String(productsSummaryQuery.data.value.single_sale_count)"
                  icon="pi pi-bolt"
                />
                <NxStatCard
                  v-if="ingredientsEnabled"
                  label="Con receta"
                  :value="String(productsSummaryQuery.data.value.with_recipe_count)"
                  icon="pi pi-book"
                />
                <NxStatCard
                  v-if="productsSummaryQuery.data.value.show_inventory_value_card"
                  label="Valor inventario"
                  :value="formatCop(productsSummaryQuery.data.value.inventory_value_cop ?? 0)"
                  icon="pi pi-wallet"
                />
              </template>
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
                    <div class="flex items-center gap-2">
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
                          {{ data.category?.name ?? 'Sin categoría'
                          }}<span v-if="data.sku"> · {{ data.sku }}</span>
                        </p>
                      </div>
                    </div>
                  </template>
                </NxColumn>
                <NxColumn header="Precio">
                  <template #body="{ data }: { data: Product }">
                    {{ data.price_varies_at_sale ? 'Variable' : formatCop(data.price) }}
                  </template>
                </NxColumn>
                <NxColumn header="Stock">
                  <template #body="{ data }: { data: Product }">
                    <span
                      :class="productStockBadge(data).class"
                      class="rounded-md px-2 py-1 text-xs font-semibold"
                    >
                      {{ productStockBadge(data).label }}
                    </span>
                  </template>
                </NxColumn>
                <NxColumn>
                  <template #body="{ data }: { data: Product }">
                    <div class="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
                      <template v-if="data.track_stock && !data.is_service && data.can_manage_stock">
                        <button
                          type="button"
                          class="text-emerald-500 hover:text-emerald-700"
                          title="Agregar stock"
                          @click="
                            openStockModal(
                              { kind: 'product', id: data.id, name: data.name, stock: data.stock },
                              'entry',
                            )
                          "
                        >
                          <i class="pi pi-plus-circle text-sm" />
                        </button>
                        <button
                          type="button"
                          class="text-red-400 hover:text-red-600"
                          title="Retirar stock"
                          @click="
                            openStockModal(
                              { kind: 'product', id: data.id, name: data.name, stock: data.stock },
                              'exit',
                            )
                          "
                        >
                          <i class="pi pi-minus-circle text-sm" />
                        </button>
                        <button
                          type="button"
                          class="text-slate-400 hover:text-indigo-600"
                          title="Ajustar stock"
                          @click="
                            openStockModal(
                              { kind: 'product', id: data.id, name: data.name, stock: data.stock },
                              'adjustment',
                            )
                          "
                        >
                          <i class="pi pi-sliders-h text-sm" />
                        </button>
                        <RouterLink
                          :to="{ name: 'catalog.products.stock-history', params: { id: data.id } }"
                          class="text-slate-400 hover:text-indigo-600"
                          title="Historial de movimientos"
                        >
                          <i class="pi pi-history text-sm" />
                        </RouterLink>
                      </template>
                      <span
                        v-else-if="data.track_stock && !data.is_service"
                        class="text-[11px] whitespace-nowrap text-slate-400"
                      >
                        {{
                          data.is_single_sale ? 'No maneja stock (venta única)' : 'Se gestiona desde Ingredientes'
                        }}
                      </span>
                      <RouterLink
                        :to="{ name: 'catalog.products.edit', params: { id: data.id } }"
                        class="text-slate-400 hover:text-indigo-600"
                        title="Editar"
                      >
                        <i class="pi pi-pencil text-sm" />
                      </RouterLink>
                      <button
                        type="button"
                        class="text-slate-300 hover:text-red-500"
                        title="Eliminar"
                        :disabled="deleteProductMutation.isPending.value"
                        @click="removeProduct(data)"
                      >
                        <i class="pi pi-trash text-sm" />
                      </button>
                    </div>
                  </template>
                </NxColumn>
              </NxDataTable>
            </div>
          </div>
        </NxTabPanel>

        <NxTabPanel v-if="ingredientsEnabled" value="ingredientes">
          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                />
              </template>
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
                  <p class="py-6 text-center text-sm text-slate-400">Todavía no hay insumos.</p>
                </template>
                <NxColumn header="Insumo">
                  <template #body="{ data }: { data: Ingredient }">
                    <p class="text-sm font-semibold text-slate-900">
                      {{ data.name }}
                      <span
                        v-if="!data.is_active"
                        class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
                      >
                        Inactivo
                      </span>
                    </p>
                  </template>
                </NxColumn>
                <NxColumn header="Unidad" field="unit" />
                <NxColumn header="Stock">
                  <template #body="{ data }: { data: Ingredient }">
                    <span
                      :class="ingredientStockBadge(data).class"
                      class="rounded-md px-2 py-1 text-xs font-semibold"
                    >
                      {{ ingredientStockBadge(data).label }}
                    </span>
                  </template>
                </NxColumn>
                <NxColumn header="Costo/unidad">
                  <template #body="{ data }: { data: Ingredient }">
                    {{ data.cost_price != null ? formatCop(Number(data.cost_price)) : '—' }}
                  </template>
                </NxColumn>
                <NxColumn>
                  <template #body="{ data }: { data: Ingredient }">
                    <div class="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
                      <button
                        type="button"
                        class="text-emerald-500 hover:text-emerald-700"
                        title="Agregar stock"
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
                        <i class="pi pi-plus-circle text-sm" />
                      </button>
                      <button
                        type="button"
                        class="text-red-400 hover:text-red-600"
                        title="Retirar stock"
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
                        <i class="pi pi-minus-circle text-sm" />
                      </button>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-indigo-600"
                        title="Ajustar stock"
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
                        <i class="pi pi-sliders-h text-sm" />
                      </button>
                      <RouterLink
                        :to="{ name: 'catalog.ingredients.stock-history', params: { id: data.id } }"
                        class="text-slate-400 hover:text-indigo-600"
                        title="Historial de movimientos"
                      >
                        <i class="pi pi-history text-sm" />
                      </RouterLink>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-indigo-600"
                        title="Editar"
                        @click="openEditIngredient(data)"
                      >
                        <i class="pi pi-pencil text-sm" />
                      </button>
                      <button
                        type="button"
                        class="text-slate-300 hover:text-red-500"
                        title="Eliminar"
                        :disabled="deleteIngredientMutation.isPending.value"
                        @click="removeIngredient(data)"
                      >
                        <i class="pi pi-trash text-sm" />
                      </button>
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
  </div>
</template>
