<script setup lang="ts">
import { computed } from 'vue'

import type { Product } from '@/types/product'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ product: Product }>()

defineEmits<{ click: [] }>()

const stockBadge = computed(() => {
  if (!props.product.track_stock) {
    return null
  }
  if (props.product.stock <= 0) {
    return { label: 'Agotado', class: 'bg-red-100 text-red-700' }
  }
  if (props.product.stock <= props.product.low_stock_alert_threshold) {
    return { label: `Quedan ${props.product.stock}`, class: 'bg-amber-100 text-amber-700' }
  }
  return null
})

const isDisabled = computed(() => props.product.track_stock && props.product.stock <= 0)
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all active:scale-[0.97]"
    :class="
      isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-indigo-300 hover:shadow-md'
    "
    :disabled="isDisabled"
    @click="$emit('click')"
  >
    <div class="flex w-full items-start justify-between gap-1">
      <i :class="product.category?.icon || 'pi pi-shop'" class="text-xl text-indigo-500" />
      <span
        v-if="stockBadge"
        :class="stockBadge.class"
        class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      >
        {{ stockBadge.label }}
      </span>
    </div>
    <p class="line-clamp-2 text-sm font-medium leading-tight text-slate-900">{{ product.name }}</p>
    <p class="text-sm font-semibold text-indigo-700">
      {{ product.price_varies_at_sale ? 'Precio variable' : formatCop(product.price) }}
    </p>
  </button>
</template>
