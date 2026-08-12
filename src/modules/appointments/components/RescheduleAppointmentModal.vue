<script setup lang="ts">
// Reprogramar cita - modal separado del de editar (igual que el legacy):
// solo fecha/hora/duracion, sin tocar servicios/cliente. El backend resetea
// el estado a 'pending' al reprogramar (ver AppointmentService::reschedule()).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Appointment } from '@/types/appointment'
import { NxButton, NxInput, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useAppointmentMutations } from '../composables/useAppointmentMutations'
import { addMinutes, combineDateAndTime, DURATION_OPTIONS, toDateInputValue, toTimeInputValue } from '../support/appointmentTime'

const props = defineProps<{
  modelValue: boolean
  appointment: Appointment | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const { rescheduleMutation } = useAppointmentMutations()

const dateValue = ref('')
const timeValue = ref('')
const durationMinutes = ref(60)
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.appointment) {
      return
    }
    const start = new Date(props.appointment.starts_at)
    const end = new Date(props.appointment.ends_at)
    dateValue.value = toDateInputValue(start)
    timeValue.value = toTimeInputValue(start)
    durationMinutes.value = Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000))
    formError.value = null
  },
)

const isSaving = computed(() => rescheduleMutation.isPending.value)

async function submit(): Promise<void> {
  if (!props.appointment) {
    return
  }
  formError.value = null
  const start = combineDateAndTime(dateValue.value, timeValue.value)
  const end = addMinutes(start, durationMinutes.value)

  try {
    await rescheduleMutation.mutateAsync({
      id: props.appointment.id,
      payload: { starts_at: start.toISOString(), ends_at: end.toISOString() },
    })
    notify('Cita reprogramada')
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos reprogramar la cita.')
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Reprogramar cita" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-4">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>
      <div class="grid grid-cols-3 gap-3">
        <NxInput v-model="dateValue" type="date" label="Fecha" required />
        <NxInput v-model="timeValue" type="time" label="Hora" required />
        <NxSelect
          :model-value="durationMinutes"
          :options="DURATION_OPTIONS.map((m) => ({ label: `${m} min`, value: m }))"
          option-label="label"
          option-value="value"
          label="Duración"
          @update:model-value="durationMinutes = $event as number"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Reprogramar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
