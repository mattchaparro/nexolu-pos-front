<script setup lang="ts">
// Modal de "Registrar ahora" para un gasto fijo: pide año/mes y opcionalmente
// sobreescribe el monto. El backend rechaza si ya existe un gasto registrado
// para ese mes (idempotencia), con mensaje claro que se muestra aqui.
import { ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { FixedExpenseTemplate } from '@/types/expense'
import { NxButton, NxInputNumber, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useFixedExpenseTemplateMutations } from '../composables/useFixedExpenseTemplateMutations'

const MONTH_OPTIONS = [
  { label: 'Enero', value: 1 },
  { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 },
  { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 },
  { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 },
  { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 },
  { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 },
  { label: 'Diciembre', value: 12 },
]

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1].map((y) => ({ label: String(y), value: y }))

const props = defineProps<{
  modelValue: boolean
  template: FixedExpenseTemplate | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { registerNowMutation } = useFixedExpenseTemplateMutations()
const { notify } = useSystemAlert()

const year = ref(currentYear)
const month = ref(new Date().getMonth() + 1)
const amountOverride = ref<number | null>(null)
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      year.value = currentYear
      month.value = new Date().getMonth() + 1
      amountOverride.value = null
      formError.value = null
    }
  },
)

async function submit(): Promise<void> {
  if (!props.template) {
    return
  }
  formError.value = null
  try {
    await registerNowMutation.mutateAsync({
      id: props.template.id,
      year: year.value,
      month: month.value,
      amount: amountOverride.value,
    })
    notify(`Gasto registrado para ${MONTH_OPTIONS[month.value - 1]?.label} ${year.value}`)
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No se pudo registrar el gasto.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="`Registrar: ${template?.name ?? ''}`"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <div class="flex gap-2">
        <NxSelect
          v-model="month"
          label="Mes"
          :options="MONTH_OPTIONS"
          option-label="label"
          option-value="value"
          class="flex-1"
        />
        <NxSelect
          v-model="year"
          label="Año"
          :options="YEAR_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-28"
        />
      </div>

      <NxInputNumber
        v-model="amountOverride"
        :label="template?.amount ? `Monto (default: $${Number(template.amount).toLocaleString('es-CO')})` : 'Monto del mes'"
        :min="0"
      />

      <p class="text-xs text-slate-500">
        Si ya existe un gasto registrado para este mes, el backend lo rechazará.
      </p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="registerNowMutation.isPending.value" @click="submit">Registrar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
