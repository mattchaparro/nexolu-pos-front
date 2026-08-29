<script setup lang="ts">
// Atributos (Talla, Color, ...) - pagina propia del hub (tab de nivel
// superior, junto a Categorias/Compras/Servicios/Proveedores), mismo
// criterio que CategoriesView: es una taxonomia reutilizable por todo el
// negocio, no una sub-tab de Articulos (que son items vendibles concretos).
// Gateado por la feature "variants" (ver router y CatalogHubTabs).
import { computed, ref } from 'vue'

import { usePermissions } from '@/composables/usePermissions'
import type { ProductAttribute } from '@/types/product'
import { NxButton, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import CatalogHubTabs from '../components/CatalogHubTabs.vue'
import ProductAttributeFormModal from '../components/ProductAttributeFormModal.vue'
import { useProductAttributeMutations } from '../composables/useProductAttributeMutations'
import { useProductAttributes } from '../composables/useProductAttributes'

const { hasPermission } = usePermissions()
const canAdd = computed(() => hasPermission('inventory.add'))
const attributesQuery = useProductAttributes(computed(() => true))
const { deleteMutation } = useProductAttributeMutations()

const modalOpen = ref(false)
const editingAttribute = ref<ProductAttribute | null>(null)

function openNewAttribute(): void {
  editingAttribute.value = null
  modalOpen.value = true
}

function openEditAttribute(attribute: ProductAttribute): void {
  editingAttribute.value = attribute
  modalOpen.value = true
}

async function removeAttribute(attribute: ProductAttribute): Promise<void> {
  if (!window.confirm(`¿Eliminar el atributo "${attribute.name}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(attribute.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el atributo.'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Atributos" icon="pi pi-sliders-h" compact />
      <NxButton v-if="canAdd" icon="pi pi-plus" @click="openNewAttribute">Atributo</NxButton>
    </div>

    <CatalogHubTabs />

    <p class="-mt-1 text-xs text-slate-400">
      Talla, color, presentación... se combinan al crear variantes de un producto.
    </p>

    <template v-if="attributesQuery.isPending.value">
      <div class="flex flex-col gap-2">
        <div v-for="n in 3" :key="n" class="h-14 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </template>
    <p v-else-if="attributesQuery.isError.value" class="text-sm text-red-700">
      No pudimos cargar los atributos. Intenta de nuevo más tarde.
    </p>
    <div v-else-if="(attributesQuery.data.value ?? []).length === 0" class="py-10 text-center text-sm text-slate-400">
      Todavía no hay atributos.
    </div>
    <div v-else class="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      <div
        v-for="attribute in attributesQuery.data.value"
        :key="attribute.id"
        class="flex items-center gap-3 px-4 py-3"
      >
        <span class="material-icons shrink-0 rounded-lg bg-indigo-50 p-1.5 text-lg text-indigo-600">
          tune
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900">{{ attribute.name }}</p>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="value in attribute.values"
              :key="value.id"
              class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
            >
              {{ value.value }}
            </span>
          </div>
        </div>
        <button
          v-if="canAdd"
          type="button"
          class="shrink-0 text-slate-400 hover:text-indigo-600"
          @click="openEditAttribute(attribute)"
        >
          <i class="pi pi-pencil text-sm" />
        </button>
        <button
          v-if="canAdd"
          type="button"
          class="shrink-0 text-slate-300 hover:text-red-500"
          :disabled="deleteMutation.isPending.value"
          @click="removeAttribute(attribute)"
        >
          <i class="pi pi-trash text-sm" />
        </button>
      </div>
    </div>

    <ProductAttributeFormModal v-model="modalOpen" :attribute="editingAttribute" />
  </div>
</template>
