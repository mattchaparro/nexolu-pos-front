<script setup lang="ts">
/**
 * El "¿papas con eso?" del cajero.
 *
 * Se ofrece lo que el comerciante configuró para el ÚLTIMO artículo agregado,
 * no para todo el carrito: en mostrador la sugerencia solo sirve si llega en
 * el momento, mientras el cliente todavía está pensando en eso que acaba de
 * pedir. Una lista de sugerencias de todo el carrito sería ruido permanente.
 *
 * Es una tira de botones grandes y no una lista: el cajero la toca de reojo,
 * con el cliente enfrente, muchas veces sin mirar.
 *
 * Se oculta sola cuando ya se agregó todo lo sugerido, para no dejar una
 * franja muerta ocupando la pantalla de venta.
 */
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { fetchCrossSells } from '@/modules/catalog/services/catalogService'
import type { Product } from '@/types/product'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{
  /** El último producto agregado. `null` con el carrito vacío. */
  productId: number | null
  /** Lo que ya está en el carrito, para no volver a ofrecerlo. */
  inCartIds: number[]
}>()

const emit = defineEmits<{ add: [product: Product] }>()

const query = useQuery({
  queryKey: computed(() => ['sell-cross-sells', props.productId]),
  queryFn: () => fetchCrossSells(props.productId as number),
  enabled: computed(() => props.productId !== null),
  // El catálogo de sugerencias cambia poco y el cajero agrega muchos
  // artículos seguidos: sin esto sería una consulta por toque.
  staleTime: 5 * 60_000,
})

const suggestions = computed(() =>
  (query.data.value ?? []).filter(
    (product) => !props.inCartIds.includes(product.id) && product.is_active,
  ),
)
</script>

<template>
  <div v-if="suggestions.length > 0" class="border-t border-slate-100 px-1 pt-2 pb-1">
    <p class="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
      Se vende bien con
    </p>

    <div class="flex gap-1.5 overflow-x-auto pb-1">
      <button
        v-for="product in suggestions"
        :key="product.id"
        type="button"
        class="flex shrink-0 flex-col items-start rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
        @click="emit('add', product)"
      >
        <span class="max-w-32 truncate text-xs font-medium text-slate-700">
          {{ product.name }}
        </span>
        <span class="text-[11px] font-semibold text-indigo-600">
          + {{ formatCop(product.price) }}
        </span>
      </button>
    </div>
  </div>
</template>
