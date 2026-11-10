<script setup lang="ts">
// Selector de opciones (salsas, toppings) al tocar un producto con
// option_groups en Vender. Un grupo con max 1 se elige como radio; con mas,
// como casillas limitadas por max_choices. Un grupo repetible (allow_repeat)
// lleva contador por opcion: la misma opcion entra varias veces (doble
// porcion de licor) y max_choices cuenta porciones. Los grupos con min >= 1
// son obligatorios - el boton Agregar queda apagado hasta cumplirlos (el API
// valida lo mismo, esto solo evita el viaje inutil).
import { computed, ref, watch } from 'vue'

import type { Product, ProductOptionGroup } from '@/types/product'
import { NxButton, NxModal, NxQuantityStepper } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { activeOptionGroups, toChosenOption, type ChosenOption } from '../support/productOptions'

const props = defineProps<{
  modelValue: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [options: ChosenOption[]]
}>()

// Por grupo, los ids elegidos; en un grupo repetible un id aparece una vez por porcion.
const selected = ref<Record<number, number[]>>({})

const groups = computed<ProductOptionGroup[]>(() => (props.product ? activeOptionGroups(props.product) : []))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selected.value = {}
    }
  },
)

function chosenIn(group: ProductOptionGroup): number[] {
  return selected.value[group.id] ?? []
}

function countOf(group: ProductOptionGroup, optionId: number): number {
  return chosenIn(group).filter((id) => id === optionId).length
}

function toggle(group: ProductOptionGroup, optionId: number): void {
  const current = chosenIn(group)
  if (current.includes(optionId)) {
    selected.value = { ...selected.value, [group.id]: current.filter((id) => id !== optionId) }
    return
  }
  if (group.max_choices === 1) {
    selected.value = { ...selected.value, [group.id]: [optionId] }
    return
  }
  if (current.length >= group.max_choices) {
    return
  }
  selected.value = { ...selected.value, [group.id]: [...current, optionId] }
}

function increment(group: ProductOptionGroup, optionId: number): void {
  const current = chosenIn(group)
  if (current.length >= group.max_choices) {
    return
  }
  selected.value = { ...selected.value, [group.id]: [...current, optionId] }
}

function decrement(group: ProductOptionGroup, optionId: number): void {
  const current = [...chosenIn(group)]
  const index = current.lastIndexOf(optionId)
  if (index === -1) {
    return
  }
  current.splice(index, 1)
  selected.value = { ...selected.value, [group.id]: current }
}

function requiredCount(group: ProductOptionGroup): number {
  const active = group.options.filter((o) => o.is_active).length
  if (group.allow_repeat) {
    return active > 0 ? group.min_choices : 0
  }
  return Math.min(group.min_choices, active)
}

const isComplete = computed(() => groups.value.every((g) => chosenIn(g).length >= requiredCount(g)))

// En el orden del catalogo, cada opcion tantas veces como porciones lleve.
const chosenOptions = computed<ChosenOption[]>(() =>
  groups.value.flatMap((g) =>
    g.options.flatMap((o) => Array.from({ length: countOf(g, o.id) }, () => toChosenOption(g, o))),
  ),
)

const extraTotal = computed(() => chosenOptions.value.reduce((sum, o) => sum + o.extraPrice, 0))

function hint(group: ProductOptionGroup): string {
  const required = requiredCount(group)
  if (group.allow_repeat) {
    const noun = group.max_choices === 1 ? 'porción' : 'porciones'
    return required > 0
      ? `${chosenIn(group).length} de ${group.max_choices} ${noun} (mínimo ${required})`
      : `${chosenIn(group).length} de ${group.max_choices} ${noun} (opcional)`
  }
  if (group.max_choices === 1) {
    return required > 0 ? 'Elige 1 (obligatorio)' : 'Elige 1 (opcional)'
  }
  return required > 0
    ? `Elige de ${required} a ${group.max_choices}`
    : `Hasta ${group.max_choices} (opcional)`
}

function confirm(): void {
  if (!isComplete.value) {
    return
  }
  emit('confirm', chosenOptions.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="product?.name ?? 'Elegir opciones'"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <section v-for="group in groups" :key="group.id" class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="text-sm font-semibold text-slate-900">{{ group.name }}</h3>
          <span class="text-xs text-slate-500">{{ hint(group) }}</span>
        </div>

        <div v-if="group.allow_repeat" class="flex flex-col gap-1.5">
          <div
            v-for="option in group.options.filter((o) => o.is_active)"
            :key="option.id"
            class="flex items-center justify-between gap-3 rounded-xl border-2 p-2 pl-2.5 transition-colors"
            :class="countOf(group, option.id) > 0 ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'"
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 flex-col items-start text-left"
              :disabled="chosenIn(group).length >= group.max_choices"
              @click="increment(group, option.id)"
            >
              <span class="text-sm font-medium text-slate-900">{{ option.name }}</span>
              <span v-if="Number(option.extra_price) > 0" class="text-xs font-semibold text-indigo-700">
                +{{ formatCop(Number(option.extra_price)) }} c/u
              </span>
            </button>
            <NxQuantityStepper
              class="shrink-0"
              :quantity="countOf(group, option.id)"
              :disable-decrement="countOf(group, option.id) === 0"
              :disable-increment="chosenIn(group).length >= group.max_choices"
              @decrement="decrement(group, option.id)"
              @increment="increment(group, option.id)"
            />
          </div>
        </div>

        <div v-else class="flex flex-col gap-1.5">
          <button
            v-for="option in group.options.filter((o) => o.is_active)"
            :key="option.id"
            type="button"
            class="flex items-center justify-between gap-3 rounded-xl border-2 p-2.5 text-left transition-colors"
            :class="
              chosenIn(group).includes(option.id)
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300'
            "
            @click="toggle(group, option.id)"
          >
            <span class="text-sm font-medium text-slate-900">{{ option.name }}</span>
            <span v-if="Number(option.extra_price) > 0" class="text-xs font-semibold text-indigo-700">
              +{{ formatCop(Number(option.extra_price)) }}
            </span>
          </button>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm text-slate-500">
          <template v-if="extraTotal > 0">Extra: {{ formatCop(extraTotal) }}</template>
        </span>
        <div class="flex gap-2">
          <NxButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</NxButton>
          <NxButton :disabled="!isComplete" @click="confirm">Agregar</NxButton>
        </div>
      </div>
    </template>
  </NxModal>
</template>
