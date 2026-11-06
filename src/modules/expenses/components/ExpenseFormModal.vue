<script setup lang="ts">
// "Salio de la caja del dia" nace apagado: un gasto pagado de la cuenta del
// local es gasto del mes igual, pero no debe descuadrar el cierre ni el turno.
// Reemplaza a la vieja "Clasificacion" (operacional/administrativo), que era lo
// unico que decidia si se descontaba de la caja y nadie entendia.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Expense } from '@/types/expense'
import { NxButton, NxDatePicker, NxInput, NxInputNumber, NxModal, NxSelect, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useExpenseMutations } from '../composables/useExpenseMutations'
import { useExpenseTypes } from '../composables/useExpenseTypes'

const PAYMENT_METHODS = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta']
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
const paidFromCashRegister = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const typeOptions = computed(() =>
  (typesQuery.data.value ?? []).map((t) => ({ label: t.name, value: t.id })),
)

function resetForm(): void {
  const today = toLocalDateIso()
  date.value = props.expense?.date ?? today
  description.value = props.expense?.description ?? ''
  value.value = props.expense ? parseFloat(props.expense.value) : null
  typeId.value = props.expense?.type?.id ?? null
  paymentMethod.value = props.expense?.payment_method ?? 'Transferencia'
  paidFromCashRegister.value = props.expense?.paid_from_cash_register ?? false
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
    // La caja solo tiene efectivo (el API hace lo mismo).
    payment_method: paidFromCashRegister.value ? 'Efectivo' : paymentMethod.value,
    paid_from_cash_register: paidFromCashRegister.value,
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

      <NxDatePicker v-model="date" label="Fecha" required :error="fieldErrors.date" />
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
      <label class="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
        <NxSwitch v-model="paidFromCashRegister" class="mt-0.5 shrink-0" />
        <span>
          <span class="block text-sm font-medium text-slate-700">Salió de la caja del día</span>
          <span class="block text-xs text-slate-500">
            Márcalo solo si pagaste con el efectivo de la caja: se descuenta del cierre y del turno. Si lo pagaste
            de la cuenta del local u otra plata, déjalo apagado.
          </span>
        </span>
      </label>
      <NxSelect
        v-if="!paidFromCashRegister"
        v-model="paymentMethod"
        label="Medio de pago"
        :options="PAYMENT_METHOD_OPTIONS"
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
