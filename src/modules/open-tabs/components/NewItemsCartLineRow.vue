<script setup lang="ts">
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
  <div class="flex flex-col gap-1.5 py-3 first:pt-0">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-medium leading-snug text-slate-900">{{ line.product.name }}</p>
        <span
          v-if="line.variant"
          class="mt-0.5 inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600"
        >
          {{ line.variant.attribute_values.map((av) => av.value).join(' / ') }}
        </span>
      </div>
      <p class="shrink-0 text-sm font-semibold text-slate-900">{{ formatCop(line.unitPrice * line.quantity) }}</p>
    </div>
    <div class="flex items-center gap-2">
      <div class="inline-flex items-center rounded-lg border border-slate-200">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-l-lg text-slate-500 hover:bg-slate-50"
          @click="emit('update:quantity', line.quantity - 1)"
        >
          <i class="pi pi-minus text-xs" />
        </button>
        <span class="w-7 text-center text-[13px] font-semibold">{{ line.quantity }}</span>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-r-lg text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          :disabled="props.line.variant ? line.quantity >= props.line.variant.stock : props.line.product.track_stock && line.quantity >= props.line.product.stock"
          @click="emit('update:quantity', line.quantity + 1)"
        >
          <i class="pi pi-plus text-xs" />
        </button>
      </div>
      <button type="button" class="ml-auto text-slate-300 hover:text-red-500" @click="emit('remove')">
        <i class="pi pi-times" />
      </button>
    </div>
  </div>
</template>
