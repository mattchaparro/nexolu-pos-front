<script setup lang="ts">
import { ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxModal, NxSelect, NxSwitch, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useReminderMutations } from '../composables/useReminderMutations'

const RECURRENCE_OPTIONS = [
  { label: 'No repetir', value: 'none' },
  { label: 'Diario', value: 'daily' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensual', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
]

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation } = useReminderMutations()
const { notify } = useSystemAlert()

const title = ref('')
const notes = ref('')
const dueDate = ref('')
const notifyTime = ref('')
const notifyWhatsapp = ref(false)
const recurrence = ref<string>('none')
const endDate = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  title.value = ''
  notes.value = ''
  dueDate.value = new Date().toISOString().slice(0, 10)
  notifyTime.value = ''
  notifyWhatsapp.value = false
  recurrence.value = 'none'
  endDate.value = ''
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

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!title.value.trim()) {
    fieldErrors.value.title = 'El título es obligatorio.'
    return
  }

  if (!dueDate.value) {
    fieldErrors.value.due_date = 'La fecha es obligatoria.'
    return
  }

  try {
    await createMutation.mutateAsync({
      title: title.value.trim(),
      notes: notes.value.trim() || null,
      due_date: dueDate.value,
      notify_time: notifyTime.value || null,
      notify_whatsapp: notifyWhatsapp.value,
      recurrence: recurrence.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
      end_date: recurrence.value !== 'none' ? (endDate.value || null) : null,
    })
    notify('Recordatorio creado')
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos crear el recordatorio.')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    title="Nuevo recordatorio"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="title" label="Título" required :error="fieldErrors.title" />

      <NxInput
        v-model="dueDate"
        label="Fecha"
        type="date"
        required
        :error="fieldErrors.due_date"
      />

      <NxInput
        v-model="notifyTime"
        label="Hora de recordatorio (opcional)"
        type="time"
        :error="fieldErrors.notify_time"
      />

      <NxTextarea v-model="notes" label="Notas (opcional)" :rows="2" />

      <NxSelect
        v-model="recurrence"
        label="Repetición"
        :options="RECURRENCE_OPTIONS"
        option-label="label"
        option-value="value"
      />

      <NxInput
        v-if="recurrence !== 'none'"
        v-model="endDate"
        label="Fecha de fin (opcional)"
        type="date"
        :error="fieldErrors.end_date"
      />

      <div class="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
        <NxSwitch v-model="notifyWhatsapp" />
        <span class="text-sm text-slate-700">Notificar por WhatsApp</span>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="createMutation.isPending.value" @click="submit">Crear</NxButton>
      </div>
    </template>
  </NxModal>
</template>
