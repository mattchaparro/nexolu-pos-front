<script setup lang="ts">
import type { Discount } from '@/types/discount'
import { NxInputNumber, NxQuantityStepper } from '@/ui'
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
    <!-- Una sola fila: nombre | -N+ | precio | quitar. Mismo layout que las
         otras dos listas de carrito (items nuevos e items guardados). -->
    <div class="flex items-center gap-2">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium leading-tight text-slate-900">
          {{ line.product.name }}
        </p>
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
        :disable-increment="line.variant ? line.quantity >= line.variant.stock : line.product.track_stock && line.quantity >= line.product.stock"
        @decrement="emit('update:quantity', line.quantity - 1)"
        @increment="emit('update:quantity', line.quantity + 1)"
      />

      <p class="min-w-[64px] shrink-0 select-none pl-1 text-right text-sm font-semibold text-slate-900">
        {{ formatCop(line.total) }}
        <span
          v-if="line.discountAmount > 0"
          class="block text-xs font-normal text-slate-400 line-through"
        >
          {{ formatCop(line.subtotal) }}
        </span>
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

    <!-- Precio editable (productos con precio variable al vender): fila
         propia, es un input ancho que no cabe en la linea principal. -->
    <NxInputNumber
      v-if="line.product.price_varies_at_sale"
      :model-value="line.unitPrice"
      size="sm"
      class="w-full"
      :min="0"
      @update:model-value="emit('update:unitPrice', $event ?? 0)"
    />

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
