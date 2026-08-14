<script setup lang="ts">
import { ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Reminder } from '@/types/reminder'
import { NxButton, NxInput, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useReminderMutations } from '../composables/useReminderMutations'

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
      newDate.value = props.reminder?.due_date ?? new Date().toISOString().slice(0, 10)
      formError.value = null
    }
  },
)

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
