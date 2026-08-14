<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Expense } from '@/types/expense'
import { NxButton, NxInput, NxInputNumber, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useExpenseMutations } from '../composables/useExpenseMutations'
import { useExpenseTypes } from '../composables/useExpenseTypes'

const PAYMENT_METHODS = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta']
const SCOPES = [
  { label: 'Operacional', value: 'operacional' },
  { label: 'Administrativo', value: 'administrativo' },
]
const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((m) => ({ label: m, value: m }))

const props = defineProps<{
  modelValue: boolean
  expense: Expense | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useExpenseMutations()
const { notify } = useSystemAlert()
const typesQuery = useExpenseTypes()

const date = ref('')
const description = ref('')
const value = ref<number | null>(null)
const typeId = ref<number | null>(null)
const paymentMethod = ref<string>('Efectivo')
const scope = ref<string>('operacional')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const typeOptions = computed(() =>
  (typesQuery.data.value ?? []).map((t) => ({ label: t.name, value: t.id })),
)

function resetForm(): void {
  const today = new Date().toISOString().slice(0, 10)
  date.value = props.expense?.date ?? today
  description.value = props.expense?.description ?? ''
  value.value = props.expense ? parseFloat(props.expense.value) : null
  typeId.value = props.expense?.type?.id ?? null
  paymentMethod.value = props.expense?.payment_method ?? 'Efectivo'
  scope.value = props.expense?.scope ?? 'operacional'
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

const isEdit = computed(() => props.expense !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!date.value) {
    fieldErrors.value.date = 'La fecha es obligatoria.'
    return
  }
  if (!description.value.trim()) {
    fieldErrors.value.description = 'La descripción es obligatoria.'
    return
  }
  if (!value.value || value.value < 100) {
    fieldErrors.value.value = 'El valor mínimo es $100.'
    return
  }
  if (!typeId.value) {
    fieldErrors.value.type_id = 'El tipo de gasto es obligatorio.'
    return
  }

  const payload = {
    date: date.value,
    description: description.value.trim(),
    value: value.value,
    type_id: typeId.value,
    payment_method: paymentMethod.value,
    scope: scope.value as 'operacional' | 'administrativo',
  }

  try {
    if (props.expense) {
      await updateMutation.mutateAsync({ id: props.expense.id, payload })
      notify('Gasto actualizado')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Gasto registrado')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el gasto.')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="isEdit ? 'Editar gasto' : 'Nuevo gasto'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="date" label="Fecha" type="date" required :error="fieldErrors.date" />
      <NxInput v-model="description" label="Descripción" required :error="fieldErrors.description" />
      <NxInputNumber v-model="value" label="Valor ($)" required :error="fieldErrors.value" :min="100" :step="1000" />
      <NxSelect
        v-model="typeId"
        label="Tipo de gasto"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        required
        :error="fieldErrors.type_id"
      />
      <NxSelect
        v-model="paymentMethod"
        label="Medio de pago"
        :options="PAYMENT_METHOD_OPTIONS"
        option-label="label"
        option-value="value"
      />
      <NxSelect
        v-model="scope"
        label="Clasificación"
        :options="SCOPES"
        option-label="label"
        option-value="value"
      />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
