<script setup lang="ts">
// Hub de Catalogo: tabs Productos (por defecto) / Categorias, calcado del
// hub real del legacy (CatalogHubLayout.vue -> tab "Articulos" con
// Productos/Ingredientes adentro, tab "Categorias" aparte) - acotado a
// Productos+Categorias en esta primera fase; Insumos/movimientos de stock
// quedan para una fase aparte (ver docs/BACKEND_READINESS.md).
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { ProductCategory } from '@/types/product'
import { NxButton, NxInput, NxPageHeader, NxStatCard, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs } from '@/ui'

import CategoryFormModal from '../components/CategoryFormModal.vue'
import CategoryList from '../components/CategoryList.vue'
import ProductListRow from '../components/ProductListRow.vue'
import { useCategories } from '../composables/useCategories'
import { useProducts } from '../composables/useProducts'

const router = useRouter()
const activeTab = ref<'products' | 'categories'>('products')

const searchInput = ref('')
const search = ref('')
const page = ref(1)
let debounceHandle: number | undefined

watch(searchInput, (value) => {
  window.clearTimeout(debounceHandle)
  debounceHandle = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})

const productsQuery = useProducts(search, page)
const categoriesQuery = useCategories()

const categoryModalOpen = ref(false)
const editingCategory = ref<ProductCategory | null>(null)

function openNewCategory(): void {
  editingCategory.value = null
  categoryModalOpen.value = true
}

function openEditCategory(category: ProductCategory): void {
  editingCategory.value = category
  categoryModalOpen.value = true
}

const meta = computed(() => productsQuery.data.value?.meta)
const canPrevPage = computed(() => (meta.value?.current_page ?? 1) > 1)
const canNextPage = computed(() => (meta.value?.current_page ?? 1) < (meta.value?.last_page ?? 1))
</script>

<template>
  <div class="flex flex-col pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Catálogo" icon="pi pi-shop" compact />
      <NxButton
        v-if="activeTab === 'products'"
        icon="pi pi-plus"
        @click="router.push({ name: 'catalog.products.create' })"
      >
        Producto
      </NxButton>
      <NxButton v-else icon="pi pi-plus" @click="openNewCategory">Categoría</NxButton>
    </div>

    <NxTabs v-model:value="activeTab" class="mt-4">
      <NxTabList>
        <NxTab value="products" icon="pi pi-box">Productos</NxTab>
        <NxTab value="categories" icon="pi pi-tags">Categorías</NxTab>
      </NxTabList>
      <NxTabPanels>
        <NxTabPanel value="products">
          <div class="flex flex-col gap-3">
            <NxInput v-model="searchInput" label="Buscar producto o SKU" size="lg" icon="pi pi-search" clearable />

            <NxStatCard v-if="meta" label="Total de productos" :value="String(meta.total)" icon="pi pi-box" />

            <template v-if="productsQuery.isPending.value">
              <div class="flex flex-col gap-2">
                <div v-for="n in 5" :key="n" class="h-16 animate-pulse rounded-xl bg-slate-100" />
              </div>
            </template>
            <p v-else-if="productsQuery.isError.value" class="text-sm text-red-700">
              No pudimos cargar los productos. Intenta de nuevo más tarde.
            </p>
            <div v-else-if="(productsQuery.data.value?.data.length ?? 0) === 0" class="py-10 text-center text-sm text-slate-400">
              {{ search ? 'Sin resultados para tu búsqueda.' : 'Todavía no hay productos.' }}
            </div>
            <div v-else class="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              <ProductListRow v-for="product in productsQuery.data.value?.data" :key="product.id" :product="product" />
            </div>

            <div v-if="meta && meta.last_page > 1" class="flex items-center justify-between pt-1">
              <NxButton size="sm" variant="outline" :disabled="!canPrevPage" @click="page = page - 1">Anterior</NxButton>
              <p class="text-xs text-slate-500">Página {{ meta.current_page }} de {{ meta.last_page }}</p>
              <NxButton size="sm" variant="outline" :disabled="!canNextPage" @click="page = page + 1">Siguiente</NxButton>
            </div>
          </div>
        </NxTabPanel>

        <NxTabPanel value="categories">
          <template v-if="categoriesQuery.isPending.value">
            <div class="flex flex-col gap-2">
              <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </template>
          <p v-else-if="categoriesQuery.isError.value" class="text-sm text-red-700">
            No pudimos cargar las categorías. Intenta de nuevo más tarde.
          </p>
          <CategoryList v-else :categories="categoriesQuery.data.value ?? []" @edit="openEditCategory" />
        </NxTabPanel>
      </NxTabPanels>
    </NxTabs>

    <CategoryFormModal
      v-model="categoryModalOpen"
      :category="editingCategory"
      :categories="categoriesQuery.data.value ?? []"
    />
  </div>
</template>
