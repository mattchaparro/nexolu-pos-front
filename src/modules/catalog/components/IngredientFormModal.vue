<script setup lang="ts">
// Modal de crear/editar insumo - a diferencia de Producto, el formulario es
// chico (nombre/unidad/costo/stock minimo) asi que entra comodo en un
// modal, igual que CategoryFormModal. El stock solo se pide al crear
// (inicial); despues se ajusta con StockMovementModal, no editando el
// insumo, para no perder trazabilidad.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Ingredient } from '@/types/product'
import { NxButton, NxInput, NxInputNumber, NxModal, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useIngredientMutations } from '../composables/useIngredientMutations'

const props = defineProps<{
  modelValue: boolean
  ingredient: Ingredient | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useIngredientMutations()
const { notify } = useSystemAlert()

const name = ref('')
const unit = ref('')
const stock = ref<number | null>(0)
const minStock = ref<number | null>(null)
const costPrice = ref<number | null>(null)
const isActive = ref(true)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  name.value = props.ingredient?.name ?? ''
  unit.value = props.ingredient?.unit ?? ''
  stock.value = 0
  // Number(): min_stock/cost_price son decimal:X en el backend, llegan
  // como string en el JSON (mismo caso que Sale.total en otros modulos).
  minStock.value = props.ingredient?.min_stock != null ? Number(props.ingredient.min_stock) : null
  costPrice.value = props.ingredient?.cost_price != null ? Number(props.ingredient.cost_price) : null
  isActive.value = props.ingredient?.is_active ?? true
  fieldErrors.value = {}
  formError.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

const isEdit = computed(() => props.ingredient !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (isEdit.value ? 'Editar insumo' : 'Nuevo insumo'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }
  if (!unit.value.trim()) {
    fieldErrors.value.unit = 'La unidad es obligatoria (ej. kg, g, ml, und).'
    return
  }

  const payload = {
    name: name.value.trim(),
    unit: unit.value.trim(),
    ...(isEdit.value ? {} : { stock: stock.value ?? 0 }),
    min_stock: minStock.value,
    cost_price: costPrice.value,
    is_active: isActive.value,
  }

  try {
    if (props.ingredient) {
      await updateMutation.mutateAsync({ id: props.ingredient.id, payload })
      notify('Insumo actualizado')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Insumo creado')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el insumo.')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="modalTitle"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
      <NxInput v-model="unit" label="Unidad (kg, g, ml, und...)" required :error="fieldErrors.unit" />
      <NxInputNumber v-if="!isEdit" v-model="stock" label="Stock inicial" :min="0" :currency="false" />
      <NxInputNumber v-model="minStock" label="Stock mínimo (opcional)" :min="0" :currency="false" />
      <NxInputNumber v-model="costPrice" label="Costo por unidad (opcional)" :min="0" />
      <NxToggleButton v-model="isActive" label="Insumo activo" icon="pi pi-check-circle" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
