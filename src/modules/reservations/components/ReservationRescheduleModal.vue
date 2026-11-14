<script setup lang="ts">
// Mover una reserva de dia u hora (o cambiar cuantos son). Si su mesa ya no
// esta libre a la nueva hora se busca otra; si no hay ninguna, el sistema lo
// dice y la reserva queda como estaba.
import { ref, watch } from 'vue'

import { NxButton, NxInput, NxInputNumber, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useReservationMutations } from '../composables/useReservations'
import type { Reservation } from '../services/reservationService'

const props = defineProps<{ modelValue: boolean; reservation: Reservation }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { reschedule } = useReservationMutations()

const date = ref('')
const time = ref('')
const partySize = ref<number | null>(null)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

// La hora del negocio (-05:00) viene en el propio texto ISO: se corta, no se convierte.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      date.value = props.reservation.starts_at.slice(0, 10)
      time.value = props.reservation.starts_at.slice(11, 16)
      partySize.value = props.reservation.party_size
      fieldErrors.value = {}
      formError.value = null
    }
  },
)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null
  try {
    await reschedule.mutateAsync({
      id: props.reservation.id,
      startsAt: `${date.value} ${time.value}`,
      partySize: partySize.value ?? props.reservation.party_size,
    })
    emit('update:modelValue', false)
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    if (Object.keys(fieldErrors.value).length === 0) {
      formError.value = extractErrorMessage(error, 'No pudimos cambiar la reserva.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Cambiar hora" size="sm" @update:model-value="emit('update:modelValue', $event)">
    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <p class="text-sm text-slate-600">{{ reservation.customer_name }}</p>
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>
      <p v-if="fieldErrors.starts_at" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ fieldErrors.starts_at }}</p>

      <div class="grid grid-cols-2 gap-3">
        <NxInput v-model="date" type="date" label="Fecha" required />
        <NxInput v-model="time" type="time" label="Hora" required />
      </div>
      <NxInputNumber v-model="partySize" label="Personas" :currency="false" :min="1" :max="40" :error="fieldErrors.party_size" />

      <div class="flex justify-end gap-2 pt-1">
        <NxButton variant="outline" type="button" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton type="submit" :loading="reschedule.isPending.value">Guardar cambio</NxButton>
      </div>
    </form>
  </NxModal>
</template>
