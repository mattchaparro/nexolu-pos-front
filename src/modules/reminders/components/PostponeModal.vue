<script setup lang="ts">
import { ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Reminder } from '@/types/reminder'
import { NxButton, NxInput, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { addDays, toDateOnly } from '../support/reminderRecurrence'
import { useReminderMutations } from '../composables/useReminderMutations'

const SHORTCUTS = [
  { label: '+1 día', days: 1 },
  { label: '+1 semana', days: 7 },
]

const props = defineProps<{
  modelValue: boolean
  reminder: Reminder | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { postponeMutation } = useReminderMutations()
const { notify } = useSystemAlert()

const newDate = ref('')
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // Default: mañana (mismo comportamiento que el legacy)
      const tomorrow = addDays(new Date(), 1)
      newDate.value = tomorrow.toISOString().slice(0, 10)
      formError.value = null
    }
  },
)

function applyShortcut(days: number): void {
  if (!props.reminder?.due_date) {
    return
  }
  const base = toDateOnly(props.reminder.due_date)
  newDate.value = addDays(base, days).toISOString().slice(0, 10)
}

async function submit(): Promise<void> {
  if (!props.reminder || !newDate.value) {
    return
  }
  formError.value = null
  try {
    await postponeMutation.mutateAsync({ id: props.reminder.id, dueDate: newDate.value })
    notify('Recordatorio pospuesto')
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos posponer el recordatorio.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="`Posponer: ${reminder?.title ?? ''}`"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <!-- Atajos rápidos -->
      <div class="flex gap-2">
        <button
          v-for="s in SHORTCUTS"
          :key="s.days"
          type="button"
          class="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-amber-400 hover:text-amber-700"
          @click="applyShortcut(s.days)"
        >
          {{ s.label }}
        </button>
      </div>

      <NxInput v-model="newDate" label="Nueva fecha" type="date" required />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="postponeMutation.isPending.value" @click="submit">Posponer</NxButton>
      </div>
    </template>
  </NxModal>
</template>
