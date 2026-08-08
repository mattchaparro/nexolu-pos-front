<script setup lang="ts">
// Editor de receta (Producto <-> Insumos, pivot ingredient_product) - solo
// se renderiza cuando el negocio tiene la feature "ingredients" (ver
// ProductFormView.vue). Mismo patron de filas repetibles que los splits de
// pago en PaymentModal.vue.
import { computed } from 'vue'

import type { Ingredient, ProductRecipeLineInput } from '@/types/product'
import { NxInputNumber, NxSelect } from '@/ui'

const props = defineProps<{
  modelValue: ProductRecipeLineInput[]
  ingredients: Ingredient[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ProductRecipeLineInput[]] }>()

const rows = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function unitFor(ingredientId: number): string {
  return props.ingredients.find((i) => i.id === ingredientId)?.unit ?? ''
}

function addRow(): void {
  const firstUnused = props.ingredients.find((i) => !rows.value.some((r) => r.ingredient_id === i.id))
  rows.value = [...rows.value, { ingredient_id: firstUnused?.id ?? props.ingredients[0]?.id ?? 0, quantity: 1 }]
}

function removeRow(index: number): void {
  rows.value = rows.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="rows.length === 0" class="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
      Sin receta - este producto no descuenta insumos al venderse.
    </div>
    <div v-for="(row, index) in rows" :key="index" class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <NxSelect
        :model-value="row.ingredient_id"
        :options="ingredients"
        option-label="name"
        option-value="id"
        label="Insumo"
        size="sm"
        class="min-w-0 flex-1"
        @update:model-value="row.ingredient_id = $event as number"
      />
      <div class="flex items-center gap-1.5">
        <NxInputNumber
          :model-value="row.quantity"
          label="Cantidad"
          size="sm"
          class="w-28"
          :min="0.001"
          :currency="false"
          @update:model-value="row.quantity = $event ?? 0"
        />
        <span v-if="unitFor(row.ingredient_id)" class="text-xs text-slate-400">{{ unitFor(row.ingredient_id) }}</span>
      </div>
      <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" @click="removeRow(index)">
        <i class="pi pi-times" />
      </button>
    </div>
    <button
      type="button"
      class="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      :disabled="ingredients.length === 0"
      @click="addRow"
    >
      + Agregar insumo
    </button>
  </div>
</template>
