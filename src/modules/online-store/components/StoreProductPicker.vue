<script setup lang="ts">
// Elegir qué productos van en el bloque de destacados.
//
// Solo ofrece los PUBLICADOS: destacar en la tienda algo que no está a la
// venta es prometerle al comprador un producto que no va a encontrar.
import { computed, ref } from 'vue'

import { fetchProducts } from '@/modules/catalog/services/catalogService'
import { useQuery } from '@tanstack/vue-query'

const props = defineProps<{ value: unknown; max?: number }>()
const emit = defineEmits<{ select: [value: unknown] }>()

const search = ref('')

const productsQuery = useQuery({
  queryKey: ['store-featured-picker'],
  queryFn: async () => (await fetchProducts({ per_page: 200 })).data,
})

const selected = computed<number[]>(() => (Array.isArray(props.value) ? (props.value as number[]) : []))

const publishable = computed(() =>
  (productsQuery.data.value ?? [])
    .filter((product) => product.is_published)
    .filter((product) => product.name.toLowerCase().includes(search.value.toLowerCase())),
)

function toggle(id: number): void {
  if (selected.value.includes(id)) {
    emit(
      'select',
      selected.value.filter((value) => value !== id),
    )
    return
  }
  if (props.max !== undefined && selected.value.length >= props.max) {
    return
  }
  emit('select', [...selected.value, id])
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <input v-model="search" type="text" class="bke-input" placeholder="Buscar producto…" />

    <div class="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
      <button
        v-for="product in publishable"
        :key="product.id"
        type="button"
        class="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
        @click="toggle(product.id)"
      >
        <span class="min-w-0 truncate text-slate-700">{{ product.name }}</span>
        <span
          v-if="selected.includes(product.id)"
          class="shrink-0 rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white"
        >
          {{ selected.indexOf(product.id) + 1 }}
        </span>
      </button>

      <p v-if="publishable.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
        No hay productos publicados que coincidan. Publícalos desde Catálogo.
      </p>
    </div>

    <p class="text-[11px] text-slate-400">
      El orden en que los elijas es el orden en que se muestran.
    </p>
  </div>
</template>
