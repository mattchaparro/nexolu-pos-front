<script setup lang="ts">
// Categorias - pagina propia del hub (tab de nivel superior, junto a
// Articulos/Compras/Servicios/Proveedores, ver CatalogHubTabs), no una
// sub-tab de Articulos - asi vive en el legacy (Admin/Categories/Index.vue,
// ruta propia fuera del hub de productos).
import { computed, ref } from 'vue'

import { usePermissions } from '@/composables/usePermissions'
import type { ProductCategory } from '@/types/product'
import { NxButton, NxInput, NxPageHeader } from '@/ui'

import CategoryFormModal from '../components/CategoryFormModal.vue'
import CategoryList from '../components/CategoryList.vue'
import CatalogHubTabs from '../components/CatalogHubTabs.vue'
import { useCategories } from '../composables/useCategories'

const { hasPermission } = usePermissions()
const canAdd = computed(() => hasPermission('inventory.add'))
const categoriesQuery = useCategories()
const categoryModalOpen = ref(false)
const editingCategory = ref<ProductCategory | null>(null)
const searchInput = ref('')

// Sin paginar (la lista completa ya vive en cache, ver useCategories) - el
// filtro es puramente en cliente. Si una subcategoria matchea, se conserva
// su padre aunque el padre no matchee (para no perder el contexto de
// jerarquia); si el padre matchea, se conservan todas sus subcategorias.
const filteredCategories = computed(() => {
  const term = searchInput.value.trim().toLowerCase()
  const all = categoriesQuery.data.value ?? []
  if (!term) {
    return all
  }
  const matchingIds = new Set(all.filter((c) => c.name.toLowerCase().includes(term)).map((c) => c.id))
  return all.filter((c) => {
    if (matchingIds.has(c.id)) {
      return true
    }
    if (c.parent_id !== null) {
      return matchingIds.has(c.parent_id)
    }
    return all.some((child) => child.parent_id === c.id && matchingIds.has(child.id))
  })
})

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

    <NxInput v-model="searchInput" label="Buscar categoría" class="max-w-sm" icon="pi pi-search" clearable />

    <template v-if="categoriesQuery.isPending.value">
      <div class="flex flex-col gap-2">
        <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </template>
    <p v-else-if="categoriesQuery.isError.value" class="text-sm text-red-700">
      No pudimos cargar las categorías. Intenta de nuevo más tarde.
    </p>
    <p v-else-if="searchInput && filteredCategories.length === 0" class="py-10 text-center text-sm text-slate-400">
      Sin resultados para "{{ searchInput }}".
    </p>
    <CategoryList
      v-else
      :categories="filteredCategories"
      :can-edit="canAdd"
      @edit="openEditCategory"
    />

    <CategoryFormModal v-model="categoryModalOpen" :category="editingCategory" :categories="categoriesQuery.data.value ?? []" />
  </div>
</template>
