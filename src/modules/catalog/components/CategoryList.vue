<script setup lang="ts">
// Listado de categorias agrupado por padre (nivel raiz + sus
// subcategorias indentadas debajo) - sin paginar, igual que el endpoint.
import { computed } from 'vue'

import type { ProductCategory } from '@/types/product'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useCategoryMutations } from '../composables/useCategoryMutations'

const props = defineProps<{ categories: ProductCategory[]; canEdit?: boolean }>()

const emit = defineEmits<{ edit: [category: ProductCategory] }>()

const { deleteMutation } = useCategoryMutations()

const grouped = computed(() => {
  const roots = props.categories.filter((c) => c.parent_id === null)
  return roots.map((root) => ({
    root,
    children: props.categories.filter((c) => c.parent_id === root.id),
  }))
})

async function remove(category: ProductCategory): Promise<void> {
  if (!window.confirm(`¿Eliminar la categoría "${category.name}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(category.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar la categoría.'))
  }
}
</script>

<template>
  <div v-if="categories.length === 0" class="py-10 text-center text-sm text-slate-400">
    Todavía no hay categorías.
  </div>
  <div v-else class="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
    <template v-for="{ root, children } in grouped" :key="root.id">
      <div class="flex items-center gap-3 px-4 py-3">
        <span class="material-icons shrink-0 rounded-lg bg-indigo-50 p-1.5 text-lg text-indigo-600">
          {{ root.icon || 'inventory_2' }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900">{{ root.name }}</p>
          <p v-if="root.description" class="truncate text-xs text-slate-500">{{ root.description }}</p>
        </div>
        <button
          v-if="canEdit"
          type="button"
          class="shrink-0 text-slate-400 hover:text-indigo-600"
          @click="emit('edit', root)"
        >
          <i class="pi pi-pencil text-sm" />
        </button>
        <button
          v-if="canEdit"
          type="button"
          class="shrink-0 text-slate-300 hover:text-red-500"
          :disabled="deleteMutation.isPending.value"
          @click="remove(root)"
        >
          <i class="pi pi-trash text-sm" />
        </button>
      </div>
      <div
        v-for="child in children"
        :key="child.id"
        class="flex items-center gap-3 bg-slate-50/60 py-2.5 pl-10 pr-4"
      >
        <span class="material-icons shrink-0 text-base text-slate-400">{{ child.icon || 'inventory_2' }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-700">{{ child.name }}</p>
          <p v-if="child.description" class="truncate text-xs text-slate-500">{{ child.description }}</p>
        </div>
        <button
          v-if="canEdit"
          type="button"
          class="shrink-0 text-slate-400 hover:text-indigo-600"
          @click="emit('edit', child)"
        >
          <i class="pi pi-pencil text-sm" />
        </button>
        <button
          v-if="canEdit"
          type="button"
          class="shrink-0 text-slate-300 hover:text-red-500"
          :disabled="deleteMutation.isPending.value"
          @click="remove(child)"
        >
          <i class="pi pi-trash text-sm" />
        </button>
      </div>
    </template>
  </div>
</template>
