<script setup lang="ts">
// Fila de la tabla de productos del Catalogo - autonoma para el borrado
// (confirm + mutation), igual que CategoryList.vue; la edicion navega a
// ProductFormView via RouterLink en vez de abrir un modal (el formulario
// de producto es demasiado largo para un modal, ver la nota en
// ProductFormView.vue).
import { computed } from 'vue'

import type { Product } from '@/types/product'
import { formatCop } from '@/utils/formatCop'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useProductMutations } from '../composables/useProductMutations'

const props = defineProps<{ product: Product }>()

const { deleteMutation } = useProductMutations()

const stockBadge = computed(() => {
  if (props.product.is_service) {
    return { label: 'Servicio', class: 'bg-slate-100 text-slate-600' }
  }
  if (!props.product.track_stock) {
    return { label: 'Sin control', class: 'bg-slate-100 text-slate-500' }
  }
  if (props.product.stock <= 0) {
    return { label: '0 en stock', class: 'bg-red-100 text-red-600' }
  }
  const threshold = props.product.low_stock_alert_threshold ?? 5
  if (props.product.stock <= threshold) {
    return { label: `${props.product.stock} en stock`, class: 'bg-amber-100 text-amber-600' }
  }
  return { label: `${props.product.stock} en stock`, class: 'bg-slate-100 text-slate-500' }
})

async function remove(): Promise<void> {
  if (!window.confirm(`¿Eliminar "${props.product.name}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(props.product.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el producto.'))
  }
}
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3">
    <span class="material-icons shrink-0 rounded-lg bg-indigo-50 p-1.5 text-lg text-indigo-600">
      {{ product.category?.icon || 'inventory_2' }}
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold text-slate-900">
        {{ product.name }}
        <span v-if="!product.is_active" class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
          Inactivo
        </span>
      </p>
      <p class="truncate text-xs text-slate-400">
        {{ product.category?.name ?? 'Sin categoría' }}<span v-if="product.sku"> · {{ product.sku }}</span>
      </p>
    </div>
    <span class="shrink-0 text-sm font-semibold text-slate-900">
      {{ product.price_varies_at_sale ? 'Variable' : formatCop(product.price) }}
    </span>
    <span :class="stockBadge.class" class="hidden shrink-0 rounded-md px-2 py-1 text-xs font-semibold sm:inline-block">
      {{ stockBadge.label }}
    </span>
    <RouterLink
      :to="{ name: 'catalog.products.edit', params: { id: product.id } }"
      class="shrink-0 text-slate-400 hover:text-indigo-600"
    >
      <i class="pi pi-pencil text-sm" />
    </RouterLink>
    <button
      type="button"
      class="shrink-0 text-slate-300 hover:text-red-500"
      :disabled="deleteMutation.isPending.value"
      @click="remove"
    >
      <i class="pi pi-trash text-sm" />
    </button>
  </div>
</template>
