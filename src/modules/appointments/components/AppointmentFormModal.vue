<script setup lang="ts">
// Crear/editar cita - puerto del modal de Admin/Appointments/Index.vue del
// legacy (mismo modal para ambos casos, alterna segun `appointment` sea
// null). El abono inicial solo aplica al crear (UpdateAppointmentRequest no
// lo acepta) - para abonar una cita ya agendada se usa PayServiceOrderModal
// sobre su orden vinculada, ver AppointmentDetailModal.
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useServiceOptions } from '@/composables/useServiceOptions'
import { useStaffOptions } from '@/composables/useStaffOptions'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Appointment, AppointmentPayload, AppointmentServiceLineInput } from '@/types/appointment'
import { NxButton, NxInput, NxInputNumber, NxModal, NxSelect, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import ClientPicker from '@/modules/clients/components/ClientPicker.vue'
import { useAppointmentMutations } from '../composables/useAppointmentMutations'
import { addMinutes, combineDateAndTime, DURATION_OPTIONS, toDateInputValue, toTimeInputValue } from '../support/appointmentTime'
import AppointmentServicesPicker from './AppointmentServicesPicker.vue'

const props = defineProps<{
  modelValue: boolean
  appointment: Appointment | null
  presetStart?: Date | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const servicesQuery = useServiceOptions()
const staffQuery = useStaffOptions()
const { createMutation, updateMutation } = useAppointmentMutations()

const isEdit = computed(() => props.appointment !== null)

const nonCreditPaymentMethods = computed(
  () => business.value?.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)) ?? [],
)

const clientId = ref<number | null>(null)
const clientName = ref('')
const clientPhone = ref('')
const clientEmail = ref('')
const services = ref<AppointmentServiceLineInput[]>([])
const staffId = ref<number | null>(null)
const dateValue = ref('')
const timeValue = ref('')
const durationMinutes = ref(60)
const notes = ref('')

const registerInitialPayment = ref(false)
const initialPayment = ref<number | null>(null)
const initialPaymentMethod = ref<string | null>(null)

const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const autoDuration = computed(() => {
  const list = servicesQuery.data.value ?? []
  const total = services.value.reduce((sum, line) => {
    const product = list.find((s) => s.id === line.id)
    return sum + (product?.duration_minutes ?? 0)
  }, 0)
  return total > 0 ? total : null
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    fieldErrors.value = {}
    formError.value = null
    registerInitialPayment.value = false
    initialPayment.value = null
    initialPaymentMethod.value = nonCreditPaymentMethods.value[0]?.id ?? null

    const appt = props.appointment
    if (appt) {
      clientId.value = appt.client?.id ?? null
      clientName.value = appt.client_name
      clientPhone.value = appt.client_phone ?? ''
      clientEmail.value = appt.client_email ?? ''
      services.value = appt.service?.id != null ? [{ id: appt.service.id, custom_price: null }] : []
      staffId.value = appt.staff?.id ?? null
      const start = new Date(appt.starts_at)
      const end = new Date(appt.ends_at)
      dateValue.value = toDateInputValue(start)
      timeValue.value = toTimeInputValue(start)
      durationMinutes.value = Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000))
    } else {
      const start = props.presetStart ?? new Date()
      clientId.value = null
      clientName.value = ''
      clientPhone.value = ''
      clientEmail.value = ''
      services.value = []
      staffId.value = null
      dateValue.value = toDateInputValue(start)
      timeValue.value = toTimeInputValue(start)
      durationMinutes.value = 60
    }
  },
)

watch(autoDuration, (value) => {
  if (value !== null && !isEdit.value) {
    durationMinutes.value = value
  }
})

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  const start = combineDateAndTime(dateValue.value, timeValue.value)
  const end = addMinutes(start, durationMinutes.value)

  const payload: AppointmentPayload = {
    client_id: clientId.value,
    services: services.value,
    user_id: staffId.value,
    client_name: clientName.value.trim(),
    client_phone: clientPhone.value.trim() || null,
    client_email: clientEmail.value.trim() || null,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    notes: notes.value.trim() || null,
    ...(!isEdit.value && registerInitialPayment.value && initialPayment.value
      ? { initial_payment: initialPayment.value, payment_method: initialPaymentMethod.value }
      : {}),
  }

  try {
    if (isEdit.value && props.appointment) {
      await updateMutation.mutateAsync({ id: props.appointment.id, payload })
      notify('Cita actualizada')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Cita agendada')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar la cita.')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="isEdit ? 'Editar cita' : 'Nueva cita'"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <ClientPicker v-model="clientId" :error="fieldErrors.client_id" />
      <NxInput v-model="clientName" label="Nombre del cliente" required :error="fieldErrors.client_name" />
      <div class="grid grid-cols-2 gap-3">
        <NxInput v-model="clientPhone" label="Teléfono (opcional)" :error="fieldErrors.client_phone" />
        <NxInput v-model="clientEmail" label="Correo (opcional)" :error="fieldErrors.client_email" />
      </div>

      <AppointmentServicesPicker v-model="services" :services="servicesQuery.data.value ?? []" :error="fieldErrors.services" />

      <NxSelect
        :model-value="staffId"
        :options="staffQuery.data.value ?? []"
        option-label="name"
        option-value="id"
        label="Personal (opcional)"
        @update:model-value="staffId = $event as number | null"
      />

      <div class="grid grid-cols-3 gap-3">
        <NxInput v-model="dateValue" type="date" label="Fecha" required :error="fieldErrors.starts_at" />
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

      <NxTextarea v-model="notes" label="Notas (opcional)" :rows="2" />

      <div v-if="!isEdit" class="flex flex-col gap-2">
        <NxToggleButton v-model="registerInitialPayment" label="Registrar abono inicial" icon="pi pi-wallet" />
        <div v-if="registerInitialPayment" class="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <NxInputNumber v-model="initialPayment" label="Monto del abono" :min="0" />
          <div>
            <p class="mb-2 text-sm font-medium text-slate-700">Método de pago</p>
            <PaymentMethodPicker
              :methods="nonCreditPaymentMethods"
              :model-value="initialPaymentMethod"
              @update:model-value="initialPaymentMethod = $event"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-none" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">{{ isEdit ? 'Guardar cambios' : 'Agendar' }}</NxButton>
      </div>
    </template>
  </NxModal>
</template>
