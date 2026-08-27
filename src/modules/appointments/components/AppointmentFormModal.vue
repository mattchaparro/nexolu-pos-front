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
import type { Business } from '@/types/business'
import { NxButton, NxDatePicker, NxInput, NxInputNumber, NxModal, NxSelect, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import ClientQuickAssociate from '@/modules/clients/components/ClientQuickAssociate.vue'
import { useAppointmentMutations } from '../composables/useAppointmentMutations'
import {
  clearAppointmentDraft,
  isAppointmentDraftEmpty,
  loadAppointmentDraft,
  saveAppointmentDraft,
} from '../support/appointmentDraftStorage'
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

// Seleccionado por defecto - "opcional" queda explicito en el label del
// monto, no en si la seccion esta abierta o no (mismo criterio que
// ServiceOrderFormView).
const registerInitialPayment = ref(true)
const initialPayment = ref<number | null>(null)
const initialPaymentMethod = ref<string | null>(null)

const totalPrice = computed(() => {
  const list = servicesQuery.data.value ?? []
  return services.value.reduce((sum, line) => {
    const svc = list.find((s) => s.id === line.id)
    const price = line.custom_price ?? Number(svc?.price ?? 0)
    return sum + price
  }, 0)
})
const remainingAfterInitialPayment = computed(() => Math.max(0, totalPrice.value - (initialPayment.value ?? 0)))
const initialPaymentExceedsTotal = computed(() => (initialPayment.value ?? 0) > totalPrice.value + 0.02)

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

// Borrador de cita nueva (ver appointmentDraftStorage.ts) - sobrevive que
// el navegador descarte la pestaña en segundo plano y la recargue de cero
// (ej. el usuario cambia a WhatsApp a copiar el numero del cliente a mitad
// de agendar). `skipNextReset` evita que el watcher de abajo (que en
// condiciones normales limpia el formulario cada vez que el modal abre
// para una cita nueva) pise el borrador recien restaurado apenas se emite
// el modelValue:true que lo vuelve a abrir.
let skipNextReset = false

function checkDraftAndMaybeRestore(biz: Business): void {
  if (props.appointment) {
    return
  }
  const draft = loadAppointmentDraft(biz.id)
  if (draft && !isAppointmentDraftEmpty(draft)) {
    clientId.value = draft.clientId
    clientName.value = draft.clientName
    clientPhone.value = draft.clientPhone
    clientEmail.value = draft.clientEmail
    services.value = draft.services
    staffId.value = draft.staffId
    dateValue.value = draft.dateValue
    timeValue.value = draft.timeValue
    durationMinutes.value = draft.durationMinutes
    notes.value = draft.notes
    skipNextReset = true
    emit('update:modelValue', true)
  }
}

// business.value puede llegar sincronico (ya en cache de TanStack Query) o
// asincronico (primera carga) - a diferencia de un watch({immediate:true})
// que se auto-detiene, evita la referencia circular de llamar stop() desde
// dentro del propio callback immediate antes de que la variable exista.
if (business.value) {
  checkDraftAndMaybeRestore(business.value)
} else {
  const stopDraftCheck = watch(business, (biz) => {
    if (!biz) {
      return
    }
    checkDraftAndMaybeRestore(biz)
    stopDraftCheck()
  })
}

let isRestoringDraft = false

watch(
  [clientId, clientName, clientPhone, clientEmail, services, staffId, dateValue, timeValue, durationMinutes, notes],
  () => {
    if (isRestoringDraft || isEdit.value || !business.value || !props.modelValue) {
      return
    }
    const draft = {
      clientId: clientId.value,
      clientName: clientName.value,
      clientPhone: clientPhone.value,
      clientEmail: clientEmail.value,
      services: services.value,
      staffId: staffId.value,
      dateValue: dateValue.value,
      timeValue: timeValue.value,
      durationMinutes: durationMinutes.value,
      notes: notes.value,
    }
    if (isAppointmentDraftEmpty(draft)) {
      clearAppointmentDraft(business.value.id)
      return
    }
    saveAppointmentDraft(business.value.id, draft)
  },
  { deep: true },
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      if (!isEdit.value && business.value) {
        clearAppointmentDraft(business.value.id)
      }
      return
    }
    if (skipNextReset) {
      skipNextReset = false
      fieldErrors.value = {}
      formError.value = null
      registerInitialPayment.value = true
      initialPayment.value = null
      initialPaymentMethod.value = nonCreditPaymentMethods.value[0]?.id ?? null
      return
    }

    isRestoringDraft = true
    fieldErrors.value = {}
    formError.value = null
    registerInitialPayment.value = true
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
    isRestoringDraft = false
  },
)

watch(autoDuration, (value) => {
  if (value !== null && !isEdit.value) {
    durationMinutes.value = value
  }
})

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

// Editar nombre/telefono a mano invalida el vinculo con el Client aplicado
// via ClientQuickAssociate - mismo criterio que PaymentModal.setCustomerName/
// setCustomerPhone: un client_id que ya no corresponde al texto es peor que
// no guardar ninguno.
function setClientName(value: string): void {
  clientName.value = value
  clientId.value = null
}

function setClientPhone(value: string): void {
  clientPhone.value = value
  clientId.value = null
}

function applyClient(client: { id: number; name: string; phone: string | null; email?: string | null }): void {
  clientName.value = client.name
  clientPhone.value = client.phone ?? ''
  clientEmail.value = client.email ?? ''
  clientId.value = client.id
}

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
    ...(!isEdit.value && registerInitialPayment.value && initialPayment.value && !initialPaymentExceedsTotal.value
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

      <NxInput
        :model-value="clientName"
        label="Nombre del cliente"
        required
        :error="fieldErrors.client_name"
        @update:model-value="setClientName"
      />
      <div class="grid grid-cols-2 gap-3">
        <NxInput :model-value="clientPhone" label="Teléfono (opcional)" :error="fieldErrors.client_phone" @update:model-value="setClientPhone" />
        <NxInput v-model="clientEmail" label="Correo (opcional)" :error="fieldErrors.client_email" />
      </div>
      <ClientQuickAssociate :name="clientName" :phone="clientPhone" @apply="applyClient" />

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
        <NxDatePicker v-model="dateValue" label="Fecha" required :error="fieldErrors.starts_at" />
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
          <NxInputNumber v-model="initialPayment" label="Monto del abono (opcional)" :min="0" :max="totalPrice" />
          <p
            v-if="initialPayment !== null"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold"
            :class="initialPaymentExceedsTotal ? 'bg-red-50 text-red-700' : 'bg-white text-slate-700'"
          >
            {{
              initialPaymentExceedsTotal
                ? 'El abono no puede superar el total de los servicios.'
                : `Quedaría debiendo: ${formatCop(remainingAfterInitialPayment)}`
            }}
          </p>
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
