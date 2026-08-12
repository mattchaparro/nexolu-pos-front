<script setup lang="ts">
// Filas del apartado (producto + cantidad + precio) - mismo patron de filas
// repetibles que PurchaseLinesEditor, pero mas simple: sin selector
// producto/insumo (un apartado siempre reserva stock de productos, igual
// que un item de venta - ver ValidatesSaleItems en el backend) y el precio
// se autocompleta con el del producto pero queda editable.
import { computed } from 'vue'

import type { Product } from '@/types/product'
import { NxInputNumber, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { newLayawayLineRow, type LayawayLineRow } from '../support/layawayLine'

const props = defineProps<{
  modelValue: LayawayLineRow[]
  products: Product[]
  errors?: Record<string, string>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: LayawayLineRow[]] }>()

const rows = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function productFor(row: LayawayLineRow): Product | undefined {
  return props.products.find((p) => p.id === row.product_id)
}

function priceVaries(row: LayawayLineRow): boolean {
  return productFor(row)?.price_varies_at_sale === true
}

function subtotalLabel(row: LayawayLineRow): string {
  const price = Number(row.unit_price) || 0
  return formatCop(price * row.quantity)
}

function onProductChange(row: LayawayLineRow, productId: number | null): void {
  row.product_id = productId
  const product = props.products.find((p) => p.id === productId)
  row.unit_price = product && !product.price_varies_at_sale ? Number(product.price) : null
}

function addRow(): void {
  rows.value = [...rows.value, newLayawayLineRow()]
}

function removeRow(index: number): void {
  if (rows.value.length === 1) {
    return
  }
  rows.value = rows.value.filter((_, i) => i !== index)
}

function errorFor(index: number, field: string): string | undefined {
  return props.errors?.[`items.${index}.${field}`]
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="(row, index) in rows" :key="row.uid" class="rounded-xl border border-slate-200 p-3">
      <div class="flex items-start gap-2">
        <span class="mt-3 shrink-0 text-xs font-bold text-slate-400">#{{ index + 1 }}</span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <NxSelect
            :model-value="row.product_id"
            :options="products"
            option-label="name"
            option-value="id"
            label="Producto"
            size="sm"
            filter
            :error="errorFor(index, 'product_id')"
            @update:model-value="onProductChange(row, $event as number | null)"
          />

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
            <NxInputNumber
              :model-value="row.quantity"
              label="Cantidad"
              size="sm"
              :currency="false"
              :min="1"
              :error="errorFor(index, 'quantity')"
              @update:model-value="row.quantity = $event ?? 1"
            />
            <NxInputNumber
              :model-value="row.unit_price"
              :label="priceVaries(row) ? 'Precio (requerido)' : 'Precio unitario'"
              size="sm"
              :min="0"
              :error="errorFor(index, 'unit_price')"
              @update:model-value="row.unit_price = $event"
            />
            <div class="col-span-2 flex flex-col gap-1">
              <p class="text-xs font-medium text-slate-500">Subtotal</p>
              <p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm tabular-nums text-slate-600">
                {{ subtotalLabel(row) }}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="mt-3 shrink-0 text-slate-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="rows.length === 1"
          title="Eliminar fila"
          @click="removeRow(index)"
        >
          <i class="pi pi-times" />
        </button>
      </div>
    </div>

    <button type="button" class="self-start text-sm font-semibold text-indigo-600 hover:text-indigo-800" @click="addRow">
      + Añadir fila
    </button>
  </div>
</template>
