<script setup lang="ts">
// Categorias - pagina propia del hub (tab de nivel superior, junto a
// Articulos/Compras/Servicios/Proveedores, ver CatalogHubTabs), no una
// sub-tab de Articulos - asi vive en el legacy (Admin/Categories/Index.vue,
// ruta propia fuera del hub de productos).
import { computed, ref } from 'vue'

import { usePermissions } from '@/composables/usePermissions'
import type { ProductCategory } from '@/types/product'
import { NxButton, NxPageHeader } from '@/ui'

import CategoryFormModal from '../components/CategoryFormModal.vue'
import CategoryList from '../components/CategoryList.vue'
import CatalogHubTabs from '../components/CatalogHubTabs.vue'
import { useCategories } from '../composables/useCategories'

const { hasPermission } = usePermissions()
const canAdd = computed(() => hasPermission('inventory.add'))
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
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Categorías" icon="pi pi-tags" compact />
      <NxButton v-if="canAdd" icon="pi pi-plus" @click="openNewCategory">Categoría</NxButton>
    </div>

    <CatalogHubTabs />

    <template v-if="categoriesQuery.isPending.value">
      <div class="flex flex-col gap-2">
        <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </template>
    <p v-else-if="categoriesQuery.isError.value" class="text-sm text-red-700">
      No pudimos cargar las categorías. Intenta de nuevo más tarde.
    </p>
    <CategoryList
      v-else
      :categories="categoriesQuery.data.value ?? []"
      :can-edit="canAdd"
      @edit="openEditCategory"
    />

    <CategoryFormModal v-model="categoryModalOpen" :category="editingCategory" :categories="categoriesQuery.data.value ?? []" />
  </div>
</template>
