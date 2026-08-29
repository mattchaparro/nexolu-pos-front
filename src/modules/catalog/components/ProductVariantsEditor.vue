<script setup lang="ts">
// Editor de variantes (Producto <-> combinaciones de valores de atributo,
// product_variant_attribute_value) - solo se renderiza cuando el negocio
// tiene la feature "variants" y el producto no es servicio/venta-unica (ver
// ProductFormView.vue). Selecciona que atributos usa el producto, arma el
// producto cartesiano de sus valores como SUGERENCIAS tildables (decision
// de negocio: ninguna combinacion se crea sola, el comerciante elige cuales
// activar) y cada una tildada se vuelve una fila editable con su propio
// sku/precio/costo/stock.
import { computed, ref, watch } from 'vue'

import type { ProductAttribute, ProductVariantInput } from '@/types/product'
import { NxInput, NxInputNumber, NxToggleButton } from '@/ui'

const props = defineProps<{
  modelValue: ProductVariantInput[]
  attributes: ProductAttribute[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ProductVariantInput[]] }>()

const rows = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function comboKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(',')
}

function attributeIdForValue(valueId: number): number | null {
  for (const attribute of props.attributes) {
    if (attribute.values.some((v) => v.id === valueId)) {
      return attribute.id
    }
  }
  return null
}

const selectedAttributeIds = ref<number[]>([])
let derivedFromExisting = false

// Al editar un producto que ya tiene variantes, deriva que atributos usa a
// partir de las filas guardadas - una sola vez (el usuario controla la
// seleccion despues de eso, no se vuelve a recalcular en cada cambio).
watch(
  () => [props.attributes, props.modelValue] as const,
  ([attributes, modelValue]) => {
    if (derivedFromExisting || attributes.length === 0 || modelValue.length === 0) {
      return
    }
    const ids = new Set<number>()
    for (const variant of modelValue) {
      for (const valueId of variant.attribute_value_ids) {
        const attributeId = attributeIdForValue(valueId)
        if (attributeId !== null) {
          ids.add(attributeId)
        }
      }
    }
    if (ids.size > 0) {
      selectedAttributeIds.value = [...ids]
      derivedFromExisting = true
    }
  },
  { immediate: true },
)

function toggleAttribute(attributeId: number): void {
  selectedAttributeIds.value = selectedAttributeIds.value.includes(attributeId)
    ? selectedAttributeIds.value.filter((id) => id !== attributeId)
    : [...selectedAttributeIds.value, attributeId]
}

interface Combination {
  key: string
  valueIds: number[]
  label: string
}

// Producto cartesiano de los valores de los atributos elegidos (ej. 3
// tallas x 2 colores = 6 combinaciones sugeridas) - ninguna se activa sola.
const combinations = computed<Combination[]>(() => {
  const selected = props.attributes.filter((a) => selectedAttributeIds.value.includes(a.id))
  if (selected.length === 0) {
    return []
  }

  let acc: { valueIds: number[]; labels: string[] }[] = [{ valueIds: [], labels: [] }]
  for (const attribute of selected) {
    const next: { valueIds: number[]; labels: string[] }[] = []
    for (const combo of acc) {
      for (const value of attribute.values) {
        next.push({ valueIds: [...combo.valueIds, value.id], labels: [...combo.labels, value.value] })
      }
    }
    acc = next
  }

  return acc.map((combo) => ({
    key: comboKey(combo.valueIds),
    valueIds: combo.valueIds,
    label: combo.labels.join(' / '),
  }))
})

function activeRow(key: string): ProductVariantInput | undefined {
  return rows.value.find((r) => comboKey(r.attribute_value_ids) === key)
}

function toggleCombination(combination: Combination): void {
  const existing = activeRow(combination.key)
  if (existing) {
    rows.value = rows.value.filter((r) => r !== existing)
  } else {
    rows.value = [
      ...rows.value,
      { sku: '', price: 0, stock: 0, is_active: true, attribute_value_ids: combination.valueIds },
    ]
  }
}

function removeCombination(combination: Combination): void {
  rows.value = rows.value.filter((r) => comboKey(r.attribute_value_ids) !== combination.key)
}

function updateRow(combination: Combination, patch: Partial<ProductVariantInput>): void {
  rows.value = rows.value.map((r) => (comboKey(r.attribute_value_ids) === combination.key ? { ...r, ...patch } : r))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="attributes.length === 0" class="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
      Todavía no hay atributos creados. Ve a Catálogo → Atributos para crear Talla, Color, etc.
    </div>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">¿Qué atributos usa?</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="attribute in attributes"
            :key="attribute.id"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            :class="
              selectedAttributeIds.includes(attribute.id)
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-500 hover:border-indigo-300'
            "
            @click="toggleAttribute(attribute.id)"
          >
            {{ attribute.name }}
          </button>
        </div>
      </div>

      <div v-if="combinations.length > 0" class="flex flex-col gap-2">
        <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Combinaciones</p>
        <div
          v-for="combination in combinations"
          :key="combination.key"
          class="rounded-lg border border-slate-200 p-2.5"
        >
          <label class="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              class="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              :checked="!!activeRow(combination.key)"
              @change="toggleCombination(combination)"
            />
            {{ combination.label }}
          </label>

          <div v-if="activeRow(combination.key)" class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NxInput
              :model-value="activeRow(combination.key)?.sku ?? ''"
              label="SKU"
              size="sm"
              @update:model-value="updateRow(combination, { sku: ($event as string) ?? '' })"
            />
            <NxInputNumber
              :model-value="activeRow(combination.key)?.price ?? 0"
              label="Precio"
              size="sm"
              :min="0"
              @update:model-value="updateRow(combination, { price: $event ?? 0 })"
            />
            <NxInputNumber
              :model-value="activeRow(combination.key)?.cost_price ?? null"
              label="Costo (opcional)"
              size="sm"
              :min="0"
              @update:model-value="updateRow(combination, { cost_price: $event ?? undefined })"
            />
            <NxInputNumber
              :model-value="activeRow(combination.key)?.stock ?? 0"
              label="Stock"
              size="sm"
              :min="0"
              :currency="false"
              @update:model-value="updateRow(combination, { stock: $event ?? 0 })"
            />
          </div>
          <div v-if="activeRow(combination.key)" class="mt-2 flex items-center justify-between gap-2">
            <NxToggleButton
              :model-value="activeRow(combination.key)?.is_active ?? true"
              label="Activa"
              icon="pi pi-check-circle"
              @update:model-value="updateRow(combination, { is_active: $event })"
            />
            <button
              type="button"
              class="text-xs font-semibold text-red-500 hover:text-red-700"
              @click="removeCombination(combination)"
            >
              Quitar
            </button>
          </div>
        </div>
      </div>
      <p v-else-if="selectedAttributeIds.length > 0" class="text-xs text-slate-400">
        Ninguno de los atributos elegidos tiene valores todavía.
      </p>
    </template>
  </div>
</template>
