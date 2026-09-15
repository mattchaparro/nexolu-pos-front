<script setup lang="ts">
import { NxQuantityStepper } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import type { NewCartLine } from '../composables/useNewItemsCart'

const props = defineProps<{
  line: NewCartLine
}>()

const emit = defineEmits<{
  'update:quantity': [quantity: number]
  remove: []
}>()
</script>

<template>
  <!-- Una sola fila: nombre | -N+ | precio | quitar. Mismo layout que las
       otras dos listas de carrito (venta directa e items guardados). -->
  <div class="flex items-center gap-2 py-3 first:pt-0">
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium leading-snug text-slate-900">{{ line.product.name }}</p>
      <span
        v-if="line.variant"
        class="mt-0.5 inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600"
      >
        {{ line.variant.attribute_values.map((av) => av.value).join(' / ') }}
      </span>
    </div>

    <NxQuantityStepper
      class="shrink-0"
      :quantity="line.quantity"
      :disable-increment="props.line.variant ? line.quantity >= props.line.variant.stock : props.line.product.track_stock && line.quantity >= props.line.product.stock"
      @decrement="emit('update:quantity', line.quantity - 1)"
      @increment="emit('update:quantity', line.quantity + 1)"
    />

    <p class="min-w-[64px] shrink-0 select-none pl-1 text-right text-sm font-semibold text-slate-900">
      {{ formatCop(line.unitPrice * line.quantity) }}
    </p>

    <button
      type="button"
      class="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
      title="Quitar"
      @click="emit('remove')"
    >
      <i class="pi pi-trash text-sm" />
    </button>
  </div>
</template>
