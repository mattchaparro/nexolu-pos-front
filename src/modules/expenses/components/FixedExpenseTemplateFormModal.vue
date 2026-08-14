<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { FixedExpenseTemplate } from '@/types/expense'
import { NxButton, NxInput, NxInputNumber, NxModal, NxSelect, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useExpenseTypes } from '../composables/useExpenseTypes'
import { useFixedExpenseTemplateMutations } from '../composables/useFixedExpenseTemplateMutations'

const SCOPES = [
  { label: 'Operacional', value: 'operacional' },
  { label: 'Administrativo', value: 'administrativo' },
]

const props = defineProps<{
  modelValue: boolean
  template: FixedExpenseTemplate | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useFixedExpenseTemplateMutations()
const { notify } = useSystemAlert()
const typesQuery = useExpenseTypes()

const name = ref('')
const amount = ref<number | null>(null)
const expenseTypeId = ref<number | null>(null)
const active = ref(true)
const dayOfMonth = ref<number | null>(null)
const scope = ref<string>('operacional')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const typeOptions = computed(() =>
  (typesQuery.data.value ?? []).map((t) => ({ label: t.name, value: t.id })),
)

const dayOptions = computed(() =>
  Array.from({ length: 28 }, (_, i) => ({ label: `Día ${i + 1}`, value: i + 1 })),
)

function resetForm(): void {
  name.value = props.template?.name ?? ''
  amount.value = props.template?.amount ? parseFloat(props.template.amount) : null
  expenseTypeId.value = props.template?.expense_type?.id ?? null
  active.value = props.template?.active ?? true
  dayOfMonth.value = props.template?.day_of_month ?? null
  scope.value = props.template?.scope ?? 'operacional'
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

const isEdit = computed(() => props.template !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }

  const payload = {
    name: name.value.trim(),
    amount: amount.value ?? null,
    expense_type_id: expenseTypeId.value ?? null,
    active: active.value,
    day_of_month: dayOfMonth.value ?? null,
    scope: scope.value as 'operacional' | 'administrativo',
  }

  try {
    if (props.template) {
      await updateMutation.mutateAsync({ id: props.template.id, payload })
      notify('Gasto fijo actualizado')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Gasto fijo creado')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar la plantilla.')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="isEdit ? 'Editar gasto fijo' : 'Nuevo gasto fijo'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
      <NxInputNumber v-model="amount" label="Monto fijo (opcional)" :error="fieldErrors.amount" :min="0" />
      <NxSelect
        v-model="expenseTypeId"
        label="Tipo de gasto (opcional)"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        :error="fieldErrors.expense_type_id"
      />
      <NxSelect
        v-model="dayOfMonth"
        label="Día del mes (opcional)"
        :options="dayOptions"
        option-label="label"
        option-value="value"
        :error="fieldErrors.day_of_month"
      />
      <NxSelect
        v-model="scope"
        label="Clasificación"
        :options="SCOPES"
        option-label="label"
        option-value="value"
      />
      <div class="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
        <NxSwitch v-model="active" />
        <span class="text-sm text-slate-700">Activo (se registra automáticamente cada mes)</span>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
