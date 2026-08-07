<script setup lang="ts">
import type { Discount } from '@/types/discount'
import { formatCop } from '@/utils/formatCop'

import type { CartLineTotals } from '../support/saleMath'

const props = defineProps<{
  line: CartLineTotals
  itemDiscounts: Discount[]
}>()

const emit = defineEmits<{
  'update:quantity': [quantity: number]
  'update:discountId': [discountId: number | null]
  'update:unitPrice': [unitPrice: number]
  remove: []
}>()

function applicableDiscounts(): Discount[] {
  return props.itemDiscounts.filter((d) => !d.product || d.product.id === props.line.product.id)
}
</script>

<template>
  <div class="flex flex-col gap-1.5 border-b border-slate-100 py-3 last:border-0">
    <div class="flex items-start justify-between gap-2">
      <p class="text-sm font-medium leading-tight text-slate-900">{{ line.product.name }}</p>
      <button
        type="button"
        class="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="Quitar"
        @click="emit('remove')"
      >
        <i class="pi pi-trash text-sm" />
      </button>
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          @click="emit('update:quantity', line.quantity - 1)"
        >
          <i class="pi pi-minus text-xs" />
        </button>
        <span class="w-6 text-center text-sm font-semibold text-slate-900">{{
          line.quantity
        }}</span>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
          :disabled="line.product.track_stock && line.quantity >= line.product.stock"
          @click="emit('update:quantity', line.quantity + 1)"
        >
          <i class="pi pi-plus text-xs" />
        </button>
      </div>

      <input
        v-if="line.product.price_varies_at_sale"
        type="number"
        min="0"
        step="1"
        class="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        :value="line.unitPrice"
        @change="emit('update:unitPrice', Number(($event.target as HTMLInputElement).value))"
      />

      <p class="text-sm font-semibold text-slate-900">
        {{ formatCop(line.total) }}
        <span
          v-if="line.discountAmount > 0"
          class="ml-1 text-xs font-normal text-slate-400 line-through"
        >
          {{ formatCop(line.subtotal) }}
        </span>
      </p>
    </div>

    <select
      v-if="applicableDiscounts().length > 0"
      class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      :value="line.discountId ?? ''"
      @change="
        emit(
          'update:discountId',
          ($event.target as HTMLSelectElement).value
            ? Number(($event.target as HTMLSelectElement).value)
            : null,
        )
      "
    >
      <option value="">Sin descuento</option>
      <option v-for="discount in applicableDiscounts()" :key="discount.id" :value="discount.id">
        {{ discount.name }}
      </option>
    </select>
  </div>
</template>
