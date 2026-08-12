<script setup lang="ts">
// Filas de la compra (producto/insumo + cantidad + total pagado) - mismo
// patron de filas repetibles que ProductIngredientsEditor (receta) y los
// splits de pago en PaymentModal. El costo unitario se muestra en modo
// solo-lectura (total pagado / cantidad), calculado en el cliente para
// feedback inmediato - el backend recalcula el mismo valor al guardar.
import { computed } from 'vue'

import type { Ingredient, Product } from '@/types/product'
import { NxInput, NxInputNumber, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { newPurchaseLineRow, type PurchaseLineRow } from '../support/purchaseLine'

const props = defineProps<{
  modelValue: PurchaseLineRow[]
  products: Product[]
  ingredients: Ingredient[]
  ingredientsEnabled: boolean
  errors?: Record<string, string>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: PurchaseLineRow[]] }>()

const rows = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const kindOptions = computed(() => {
  const options: { label: string; value: 'product' | 'ingredient' }[] = [{ label: 'Producto', value: 'product' }]
  if (props.ingredientsEnabled) {
    options.push({ label: 'Ingrediente', value: 'ingredient' })
  }
  return options
})

function unitFor(row: PurchaseLineRow): string {
  if (row.kind === 'product') {
    return 'und'
  }
  return props.ingredients.find((i) => i.id === row.ingredient_id)?.unit ?? ''
}

function unitCostLabel(row: PurchaseLineRow): string {
  const quantity = Number(row.quantity) || 0
  const total = Number(row.line_total_cop) || 0
  if (quantity <= 0) {
    return '—'
  }
  return formatCop(total / quantity)
}

function addRow(): void {
  rows.value = [...rows.value, newPurchaseLineRow(kindOptions.value[0]?.value ?? 'product')]
}

function removeRow(index: number): void {
  if (rows.value.length === 1) {
    return
  }
  rows.value = rows.value.filter((_, i) => i !== index)
}

function errorFor(index: number, field: string): string | undefined {
  return props.errors?.[`lines.${index}.${field}`]
}

function onKindChange(row: PurchaseLineRow, value: 'product' | 'ingredient'): void {
  row.kind = value
  row.product_id = null
  row.ingredient_id = null
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="(row, index) in rows" :key="row.uid" class="rounded-xl border border-slate-200 p-3">
      <div class="flex items-start gap-2">
        <span class="mt-3 shrink-0 text-xs font-bold text-slate-400">#{{ index + 1 }}</span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="flex flex-col gap-2 sm:flex-row">
            <NxSelect
              v-if="kindOptions.length > 1"
              :model-value="row.kind"
              :options="kindOptions"
              option-label="label"
              option-value="value"
              label="Tipo"
              size="sm"
              class="sm:w-40"
              @update:model-value="onKindChange(row, $event as 'product' | 'ingredient')"
            />
            <NxSelect
              v-if="row.kind === 'product'"
              :model-value="row.product_id"
              :options="products"
              option-label="name"
              option-value="id"
              label="Producto"
              size="sm"
              filter
              class="min-w-0 flex-1"
              :error="errorFor(index, 'product_id')"
              @update:model-value="row.product_id = $event as number | null"
            />
            <NxSelect
              v-else
              :model-value="row.ingredient_id"
              :options="ingredients"
              option-label="name"
              option-value="id"
              label="Ingrediente"
              size="sm"
              filter
              class="min-w-0 flex-1"
              :error="errorFor(index, 'ingredient_id')"
              @update:model-value="row.ingredient_id = $event as number | null"
            />
          </div>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
            <NxInputNumber
              :model-value="row.quantity"
              :label="`Cantidad (${unitFor(row)})`"
              size="sm"
              :currency="false"
              :min="0"
              :error="errorFor(index, 'quantity')"
              @update:model-value="row.quantity = $event"
            />
            <NxInputNumber
              :model-value="row.line_total_cop"
              label="Total pagado"
              size="sm"
              :min="0"
              :error="errorFor(index, 'line_total_cop')"
              @update:model-value="row.line_total_cop = $event"
            />
            <div class="flex flex-col gap-1">
              <p class="text-xs font-medium text-slate-500">Costo unitario</p>
              <p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm tabular-nums text-slate-600">
                {{ unitCostLabel(row) }}
              </p>
            </div>
            <NxInput v-model="row.notes" label="Nota (opcional)" size="sm" />
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
