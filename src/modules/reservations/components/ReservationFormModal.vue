<script setup lang="ts">
// Anotar una reserva a mano: la que llega por llamada, por WhatsApp o en el
// mostrador. Puede ir a cualquier hora (quien la anota sabe lo que hace) y,
// si ya sabes la mesa, se deja asignada.
import { computed, ref, watch } from 'vue'

import { useTables } from '@/modules/open-tabs/composables/useTables'
import { NxButton, NxInput, NxInputNumber, NxModal, NxSelect, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useReservationMutations } from '../composables/useReservations'
import { todayIso } from '../support/reservationText'

const props = defineProps<{ modelValue: boolean; defaultDate?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { create } = useReservationMutations()
const tablesQuery = useTables()

const name = ref('')
const phone = ref('')
const email = ref('')
const partySize = ref<number | null>(2)
const date = ref(todayIso())
const time = ref('19:00')
const tableId = ref<number | null>(null)
const notes = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      name.value = ''
      phone.value = ''
      email.value = ''
      partySize.value = 2
      date.value = props.defaultDate ?? todayIso()
      time.value = '19:00'
      tableId.value = null
      notes.value = ''
      fieldErrors.value = {}
      formError.value = null
    }
  },
)

const tables = computed(() =>
  (tablesQuery.data.value ?? []).filter((t) => t.is_active && t.capacity >= (partySize.value ?? 1)),
)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null
  try {
    await create.mutateAsync({
      name: name.value.trim(),
      phone: phone.value.trim(),
      email: email.value.trim() || null,
      party_size: partySize.value ?? 1,
      starts_at: `${date.value} ${time.value}`,
      table_id: tableId.value,
      notes: notes.value.trim() || null,
    })
    emit('update:modelValue', false)
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    if (Object.keys(fieldErrors.value).length === 0) {
      formError.value = extractErrorMessage(error, 'No pudimos anotar la reserva.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Nueva reserva" @update:model-value="emit('update:modelValue', $event)">
    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
      <NxInput v-model="phone" type="tel" label="Teléfono" required :error="fieldErrors.phone" />
      <div class="grid grid-cols-2 gap-3">
        <NxInput v-model="date" type="date" label="Fecha" required :error="fieldErrors.starts_at" />
        <NxInput v-model="time" type="time" label="Hora" required />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <NxInputNumber v-model="partySize" label="Personas" :currency="false" :min="1" :max="40" :error="fieldErrors.party_size" />
        <NxSelect
          v-model="tableId"
          :options="tables"
          option-label="name"
          option-value="id"
          label="Mesa (opcional)"
          show-clear
          :error="fieldErrors.table_id"
        />
      </div>
      <NxInput v-model="email" type="email" label="Correo (opcional)" :error="fieldErrors.email" />
      <NxTextarea v-model="notes" label="Comentarios (opcional)" :rows="2" />

      <div class="flex justify-end gap-2 pt-1">
        <NxButton variant="outline" type="button" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton type="submit" :loading="create.isPending.value">Anotar reserva</NxButton>
      </div>
    </form>
  </NxModal>
</template>
