<script setup lang="ts">
// Editor de opciones de eleccion (salsas, toppings): grupos con minimo y
// maximo de elecciones, y dentro de cada grupo las opciones con recargo y,
// opcionalmente, un insumo que descuentan. Los ids se conservan al editar
// para que el API actualice en sitio en vez de recrear.
import type { Ingredient, ProductOptionGroupInput } from '@/types/product'
import { NxInput, NxInputNumber, NxSelect } from '@/ui'

const props = defineProps<{
  modelValue: ProductOptionGroupInput[]
  ingredients: Ingredient[]
  ingredientsEnabled: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ProductOptionGroupInput[]] }>()

function update(next: ProductOptionGroupInput[]): void {
  emit('update:modelValue', next)
}

function blankOption(): ProductOptionGroupInput['options'][number] {
  return { name: '', extra_price: 0, ingredient_id: null, ingredient_quantity: null }
}

function addGroup(): void {
  update([...props.modelValue, { name: '', min_choices: 1, max_choices: 1, options: [blankOption()] }])
}

function removeGroup(index: number): void {
  update(props.modelValue.filter((_, i) => i !== index))
}

function addOption(group: ProductOptionGroupInput): void {
  group.options.push(blankOption())
}

function removeOption(group: ProductOptionGroupInput, index: number): void {
  group.options.splice(index, 1)
}

function setIngredient(option: ProductOptionGroupInput['options'][number], id: number | null): void {
  option.ingredient_id = id
  option.ingredient_quantity = id === null ? null : (option.ingredient_quantity ?? 1)
}

function unitFor(ingredientId: number | null | undefined): string {
  return props.ingredients.find((i) => i.id === ingredientId)?.unit ?? ''
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="modelValue.length === 0" class="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
      Sin opciones - el producto se vende tal cual. Agrega un grupo (ej. Salsa) para que se elija al vender.
    </div>

    <div v-for="(group, gi) in modelValue" :key="group.id ?? `new-${gi}`" class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div class="flex items-center gap-2">
        <NxInput v-model="group.name" label="Nombre del grupo" size="sm" class="min-w-0 flex-1" />
        <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" title="Quitar grupo" @click="removeGroup(gi)">
          <i class="pi pi-trash" />
        </button>
      </div>
      <div class="flex gap-2">
        <NxInputNumber
          :model-value="group.min_choices"
          label="Minimo a elegir"
          size="sm"
          class="flex-1"
          :min="0"
          :currency="false"
          @update:model-value="group.min_choices = $event ?? 0"
        />
        <NxInputNumber
          :model-value="group.max_choices"
          label="Maximo a elegir"
          size="sm"
          class="flex-1"
          :min="1"
          :currency="false"
          @update:model-value="group.max_choices = $event ?? 1"
        />
      </div>

      <div v-for="(option, oi) in group.options" :key="option.id ?? `new-${oi}`" class="flex flex-col gap-1.5 rounded-lg bg-white p-2">
        <div class="flex items-center gap-2">
          <NxInput v-model="option.name" label="Opcion" size="sm" class="min-w-0 flex-1" />
          <NxInputNumber
            :model-value="option.extra_price"
            label="Recargo"
            size="sm"
            class="w-32"
            :min="0"
            @update:model-value="option.extra_price = $event ?? 0"
          />
          <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" title="Quitar opcion" @click="removeOption(group, oi)">
            <i class="pi pi-times" />
          </button>
        </div>
        <div v-if="ingredientsEnabled" class="flex items-center gap-2">
          <NxSelect
            :model-value="option.ingredient_id ?? null"
            :options="ingredients"
            option-label="name"
            option-value="id"
            label="Descuenta insumo (opcional)"
            size="sm"
            show-clear
            class="min-w-0 flex-1"
            @update:model-value="setIngredient(option, ($event as number | null) ?? null)"
          />
          <template v-if="option.ingredient_id">
            <NxInputNumber
              :model-value="option.ingredient_quantity ?? 1"
              label="Cantidad"
              size="sm"
              class="w-28"
              :min="0.001"
              :currency="false"
              @update:model-value="option.ingredient_quantity = $event ?? 1"
            />
            <span class="text-xs text-slate-400">{{ unitFor(option.ingredient_id) }}</span>
          </template>
        </div>
      </div>
      <button type="button" class="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800" @click="addOption(group)">
        + Agregar opcion
      </button>
    </div>

    <button type="button" class="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800" @click="addGroup">
      + Agregar grupo de opciones
    </button>
  </div>
</template>
