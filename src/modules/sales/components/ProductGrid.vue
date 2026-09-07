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

const props = withDefaults(
  defineProps<{
    products: Product[]
    categories: ProductCategory[]
    /** Ids de lo que mas rota, de mayor a menor - ver useProductCatalog. */
    frequentIds?: number[]
  }>(),
  { frequentIds: () => [] },
)

const emit = defineEmits<{ select: [product: Product] }>()

const search = ref('')
const selectedCategoryId = ref<number | null>(null)
// Filtro "Frecuentes": vive aparte de selectedCategoryId porque no es una
// categoria del negocio sino un corte por rotacion, y los dos son
// excluyentes (elegir uno apaga el otro).
const frequentSelected = ref(false)

const categoriesInUse = computed(() => {
  const idsWithProducts = new Set(props.products.map((p) => p.category?.id).filter(Boolean))
  return props.categories.filter((c) => idsWithProducts.has(c.id))
})

// Solo se ofrece si hay historial que respalde el atajo: un negocio recien
// migrado (o recien abierto) no tiene "frecuentes" que mostrar.
const hasFrequent = computed(() => props.frequentIds.length > 0)

/** Posicion en el ranking, para ordenar la grilla por rotacion. */
const frequentRank = computed(() => new Map(props.frequentIds.map((id, index) => [id, index])))

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()

  const list = props.products.filter((product) => {
    if (!product.is_active) {
      return false
    }
    if (frequentSelected.value && !frequentRank.value.has(product.id)) {
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

  // Con "Frecuentes" activo el orden ES la informacion: lo que mas se vende
  // tiene que quedar arriba, no en orden alfabetico.
  if (frequentSelected.value) {
    return [...list].sort(
      (a, b) => (frequentRank.value.get(a.id) ?? Infinity) - (frequentRank.value.get(b.id) ?? Infinity),
    )
  }

  return list
})

function selectCategory(id: number | null): void {
  frequentSelected.value = false
  selectedCategoryId.value = selectedCategoryId.value === id ? null : id
}

function toggleFrequent(): void {
  frequentSelected.value = !frequentSelected.value
  if (frequentSelected.value) {
    selectedCategoryId.value = null
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <NxInput
      v-model="search"
      label="Buscar producto"
      size="lg"
      icon="pi pi-search"
      clearable
      blur-after-typing
    />

    <div v-if="categoriesInUse.length > 0 || hasFrequent" class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <!-- Primero de la fila: en un mostrador el 80% de lo que se cobra son
           los mismos pocos productos, asi que el atajo tiene que estar donde
           el pulgar ya esta, antes de cualquier categoria. -->
      <button
        v-if="hasFrequent"
        type="button"
        class="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
        :class="
          frequentSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        @click="toggleFrequent"
      >
        <i class="pi pi-bolt text-xs" />
        Frecuentes
      </button>
      <button
        type="button"
        class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
        :class="
          selectedCategoryId === null && !frequentSelected
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
        <i class="pi pi-search-minus text-5xl" />
        <p class="text-sm">No se encontraron productos.</p>
      </div>
      <div v-else class="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-5">
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
