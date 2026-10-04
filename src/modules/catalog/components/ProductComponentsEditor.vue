<script setup lang="ts">
// Editor de combo: las piezas que se descuentan al vender (productos e
// insumos con su cantidad por combo). Solo aparece con la feature
// "product_options" (ver ProductFormView.vue).
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { fetchProducts } from '@/modules/catalog/services/catalogService'
import type { Ingredient, ProductComponentInput } from '@/types/product'
import { NxInputNumber, NxSelect } from '@/ui'

const props = defineProps<{
  modelValue: ProductComponentInput[]
  ingredients: Ingredient[]
  currentProductId: number | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ProductComponentInput[]] }>()

const productsQuery = useQuery({
  queryKey: ['combo-components-products'],
  queryFn: async () => (await fetchProducts({ per_page: 200 })).data,
})

interface PieceOption {
  key: string
  label: string
  unit: string
}

const pieces = computed<PieceOption[]>(() => [
  ...(productsQuery.data.value ?? [])
    .filter((p) => p.id !== props.currentProductId && !p.is_service && !(p.components?.length ?? 0))
    .map((p) => ({ key: `p:${p.id}`, label: `${p.name} (producto)`, unit: 'und' })),
  ...props.ingredients.map((i) => ({ key: `i:${i.id}`, label: `${i.name} (insumo)`, unit: i.unit })),
])

function keyOf(row: ProductComponentInput): string {
  return row.component_product_id ? `p:${row.component_product_id}` : `i:${row.ingredient_id}`
}

function unitOf(row: ProductComponentInput): string {
  return pieces.value.find((p) => p.key === keyOf(row))?.unit ?? ''
}

function build(key: string, quantity: number): ProductComponentInput {
  const [kind, id] = key.split(':')
  return kind === 'p'
    ? { component_product_id: Number(id), ingredient_id: null, quantity: Math.max(1, Math.round(quantity)) }
    : { component_product_id: null, ingredient_id: Number(id), quantity }
}

function pick(index: number, key: string): void {
  const next = [...props.modelValue]
  next[index] = build(key, next[index].quantity)
  emit('update:modelValue', next)
}

function setQuantity(index: number, quantity: number | null): void {
  const next = [...props.modelValue]
  next[index] = { ...next[index], quantity: quantity ?? 0 }
  emit('update:modelValue', next)
}

function addRow(): void {
  const first = pieces.value.find((p) => !props.modelValue.some((r) => keyOf(r) === p.key))
  if (first) {
    emit('update:modelValue', [...props.modelValue, build(first.key, 1)])
  }
}

function removeRow(index: number): void {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="modelValue.length === 0"
      class="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400"
    >
      No es un combo. Agrega piezas (productos o insumos) para que al venderlo se descuente cada una.
    </div>
    <div v-for="(row, index) in modelValue" :key="index" class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <NxSelect
        :model-value="keyOf(row)"
        :options="pieces"
        option-label="label"
        option-value="key"
        class="min-w-0 flex-1"
        @update:model-value="pick(index, $event as string)"
      />
      <div class="flex items-center gap-1.5">
        <NxInputNumber
          :model-value="row.quantity"
          class="w-28"
          :min="row.component_product_id ? 1 : 0.001"
          @update:model-value="setQuantity(index, $event as number | null)"
        />
        <span v-if="unitOf(row)" class="text-xs text-slate-400">{{ unitOf(row) }}</span>
      </div>
      <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" @click="removeRow(index)">
        <i class="pi pi-times" />
      </button>
    </div>
    <button
      type="button"
      class="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      :disabled="pieces.length === 0"
      @click="addRow"
    >
      + Agregar pieza
    </button>
  </div>
</template>
