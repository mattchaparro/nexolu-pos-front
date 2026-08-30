<script setup lang="ts">
/**
 * Qué sugerir a quien lleve este producto.
 *
 * Se guarda por separado del producto, no como campo del formulario: es una
 * relación, y un producto nuevo todavía no tiene id mientras se llena. Por
 * eso el selector solo aparece al EDITAR, y al crear se muestra el aviso de
 * que primero hay que guardar.
 *
 * El orden importa — es el orden en que se ofrecen —, así que se agrega al
 * final y se puede subir/bajar, en vez de ordenar por catálogo.
 */
import { useQuery } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { fetchProducts } from '@/modules/catalog/services/catalogService'
import type { Product } from '@/types/product'
import { NxInput } from '@/ui'

const props = defineProps<{
  /** `null` mientras el producto no existe todavía. */
  productId: number | null
  modelValue: number[]
  max: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number[]] }>()

const search = ref('')

const productsQuery = useQuery({
  queryKey: ['cross-sell-picker'],
  queryFn: async () => (await fetchProducts({ per_page: 200 })).data,
  enabled: computed(() => props.productId !== null),
})

const catalog = computed(() => productsQuery.data.value ?? [])

/** Los elegidos, en el orden guardado. */
const chosen = computed<Product[]>(() =>
  props.modelValue
    .map((id) => catalog.value.find((product) => product.id === id))
    .filter((product): product is Product => product !== undefined),
)

const results = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (term === '') {
    return []
  }

  return catalog.value
    .filter(
      (product) =>
        product.id !== props.productId &&
        !props.modelValue.includes(product.id) &&
        product.name.toLowerCase().includes(term),
    )
    .slice(0, 8)
})

const isFull = computed(() => props.modelValue.length >= props.max)

function add(product: Product): void {
  if (isFull.value) {
    return
  }
  emit('update:modelValue', [...props.modelValue, product.id])
  search.value = ''
}

function remove(id: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((current) => current !== id),
  )
}

function move(index: number, delta: number): void {
  const next = [...props.modelValue]
  const target = index + delta
  if (target < 0 || target >= next.length) {
    return
  }
  ;[next[index], next[target]] = [next[target], next[index]]
  emit('update:modelValue', next)
}

// Al cambiar de producto el buscador vuelve a cero: dejarlo con el término
// anterior confunde sobre qué se está editando.
watch(
  () => props.productId,
  () => (search.value = ''),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="productId === null" class="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
      Guarda el producto primero y aquí podrás elegir qué sugerir con él.
    </p>

    <template v-else>
      <div v-if="chosen.length > 0" class="flex flex-col gap-1.5">
        <div
          v-for="(product, index) in chosen"
          :key="product.id"
          class="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5"
        >
          <span class="w-5 shrink-0 text-center text-xs font-semibold text-slate-400">
            {{ index + 1 }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm text-slate-700">{{ product.name }}</span>

          <button
            type="button"
            class="rounded px-1.5 py-1 text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
            :disabled="index === 0"
            title="Subir"
            @click="move(index, -1)"
          >
            <i class="pi pi-arrow-up" />
          </button>
          <button
            type="button"
            class="rounded px-1.5 py-1 text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
            :disabled="index === chosen.length - 1"
            title="Bajar"
            @click="move(index, 1)"
          >
            <i class="pi pi-arrow-down" />
          </button>
          <button
            type="button"
            class="rounded px-1.5 py-1 text-xs text-slate-400 hover:text-red-600"
            title="Quitar"
            @click="remove(product.id)"
          >
            <i class="pi pi-times" />
          </button>
        </div>
      </div>

      <div v-if="!isFull">
        <NxInput v-model="search" placeholder="Buscar un producto para sugerir" />

        <div v-if="results.length > 0" class="mt-1 rounded-lg border border-slate-200">
          <button
            v-for="product in results"
            :key="product.id"
            type="button"
            class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            @click="add(product)"
          >
            {{ product.name }}
          </button>
        </div>
      </div>

      <p v-else class="text-xs text-slate-400">Llegaste al máximo de {{ max }} sugerencias.</p>
    </template>
  </div>
</template>
