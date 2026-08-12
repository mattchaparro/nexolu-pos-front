<script setup lang="ts">
// Recordatorio de visita del proveedor ("mañana viene Postobón") - crea un
// Reminder via POST /suppliers/{id}/remind-visit. Recurrencia limitada a
// una sola vez/semanal/mensual, igual que Suppliers/Index.vue del legacy
// (Reminder soporta mas opciones, pero este caso de uso nunca las
// necesito).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Supplier, SupplierReminderRecurrence } from '@/types/supplier'
import { NxButton, NxInput, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useSupplierMutations } from '../composables/useSupplierMutations'

const props = defineProps<{
  modelValue: boolean
  supplier: Supplier | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { remindVisitMutation } = useSupplierMutations()
const { notify } = useSystemAlert()

const RECURRENCE_OPTIONS: { label: string; value: SupplierReminderRecurrence }[] = [
  { label: 'Una sola vez', value: 'none' },
  { label: 'Cada semana', value: 'weekly' },
  { label: 'Cada mes', value: 'monthly' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const dueDate = ref(today())
const recurrence = ref<SupplierReminderRecurrence>('none')
const endDate = ref('')
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      dueDate.value = today()
      recurrence.value = 'none'
      endDate.value = ''
      formError.value = null
    }
  },
)

const showEndDate = computed(() => recurrence.value !== 'none')

async function submit(): Promise<void> {
  if (!props.supplier) {
    return
  }
  formError.value = null

  try {
    await remindVisitMutation.mutateAsync({
      id: props.supplier.id,
      payload: {
        due_date: dueDate.value,
        recurrence: recurrence.value,
        end_date: showEndDate.value ? endDate.value || null : null,
      },
    })
    notify('Recordatorio creado')
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos crear el recordatorio.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="supplier ? `Recordar visita — ${supplier.name}` : 'Recordar visita'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="dueDate" type="date" label="Fecha" required />
      <NxSelect
        :model-value="recurrence"
        :options="RECURRENCE_OPTIONS"
        option-label="label"
        option-value="value"
        label="Se repite"
        @update:model-value="recurrence = $event as SupplierReminderRecurrence"
      />
      <NxInput v-if="showEndDate" v-model="endDate" type="date" label="Repetir hasta (opcional)" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="remindVisitMutation.isPending.value" @click="submit">
          Crear recordatorio
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
