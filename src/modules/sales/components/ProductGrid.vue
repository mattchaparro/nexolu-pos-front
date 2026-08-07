<script setup lang="ts">
// Buscador + chips de categoria + grid de productos. Simplificacion
// deliberada sobre el legacy: categorias en una sola fila plana (por
// nombre), sin el drill-down padre/hijo de SalesTerminal.vue - ese
// filtrado de 2 niveles estaba hardcodeado (el propio comentario del
// legacy lo confirmaba, no soporta un 3er nivel) y no vale la pena
// repetirlo sin evidencia de que el negocio lo necesite.
import { computed, ref } from 'vue'

import type { ProductCategory } from '@/types/product'
import type { Product } from '@/types/product'
import { NxInput } from '@/ui'

import ProductCard from './ProductCard.vue'

const props = defineProps<{
  products: Product[]
  categories: ProductCategory[]
}>()

const emit = defineEmits<{ select: [product: Product] }>()

const search = ref('')
const selectedCategoryId = ref<number | null>(null)

const categoriesInUse = computed(() => {
  const idsWithProducts = new Set(props.products.map((p) => p.category?.id).filter(Boolean))
  return props.categories.filter((c) => idsWithProducts.has(c.id))
})

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()

  return props.products.filter((product) => {
    if (!product.is_active) {
      return false
    }
    if (selectedCategoryId.value !== null && product.category?.id !== selectedCategoryId.value) {
      return false
    }
    if (term && !product.name.toLowerCase().includes(term)) {
      return false
    }
    return true
  })
})

function selectCategory(id: number | null): void {
  selectedCategoryId.value = selectedCategoryId.value === id ? null : id
}
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <NxInput v-model="search" placeholder="Buscar producto..." size="lg" icon="pi pi-search" />

    <div v-if="categoriesInUse.length > 0" class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button
        type="button"
        class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
        :class="
          selectedCategoryId === null
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        @click="selectCategory(null)"
      >
        Todas
      </button>
      <button
        v-for="category in categoriesInUse"
        :key="category.id"
        type="button"
        class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
        :class="
          selectedCategoryId === category.id
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        @click="selectCategory(category.id)"
      >
        {{ category.name }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="filteredProducts.length === 0"
        class="flex h-full flex-col items-center justify-center gap-2 text-slate-400"
      >
        <i class="pi pi-inbox text-3xl" />
        <p class="text-sm">No hay productos que coincidan.</p>
      </div>
      <div v-else class="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <ProductCard
          v-for="product in filteredProducts"
          :key="product.id"
          :product="product"
          @click="emit('select', product)"
        />
      </div>
    </div>
  </div>
</template>
