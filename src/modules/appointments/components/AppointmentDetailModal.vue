<script setup lang="ts">
// Panel de detalle de una cita (al hacer click en un bloque del calendario) -
// resumen + acciones: editar, reprogramar, abonar (si tiene orden de
// servicio vinculada con saldo), cambiar estado, cancelar. Puerto
// simplificado del modal unico de Admin/Appointments/Index.vue del legacy
// (alli el abono vive dentro del mismo modal de editar; aca se separa en
// PayServiceOrderModal, reusado tal cual del modulo de Ordenes de servicio).
import { computed, ref } from 'vue'

import StageBadge from '@/components/StageBadge.vue'
import { useServiceWorkflow } from '@/composables/useServiceWorkflow'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Appointment, AppointmentStatus } from '@/types/appointment'
import type { ServiceOrder } from '@/types/serviceOrder'
import { NxButton, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useServiceOrderMutations } from '@/modules/service-orders/composables/useServiceOrderMutations'
import PayServiceOrderModal from '@/modules/service-orders/components/PayServiceOrderModal.vue'
import { useAppointmentMutations } from '../composables/useAppointmentMutations'
import AppointmentFormModal from './AppointmentFormModal.vue'
import RescheduleAppointmentModal from './RescheduleAppointmentModal.vue'

const props = defineProps<{
  modelValue: boolean
  appointment: Appointment | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const { updateStatusMutation, deleteMutation } = useAppointmentMutations()
const { setStageMutation } = useServiceOrderMutations()
const workflowQuery = useServiceWorkflow()
const stageOptions = computed(() => workflowQuery.data.value?.stages ?? [])

const statusOptions = [
  { label: 'Pendiente', value: 'pending' },
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'Completada', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
]

const editModalOpen = ref(false)
const rescheduleModalOpen = ref(false)
const payModalOpen = ref(false)
const actionError = ref<string | null>(null)

// service_order llega como Partial<ServiceOrder> por el "whenLoaded en
// relacion sin match serializa como recurso todo-null" - cuando SI tiene
// id, el backend siempre lo carga completo (items/payments incluidos).
const linkedOrder = computed<ServiceOrder | null>(() =>
  props.appointment?.service_order?.id != null ? (props.appointment.service_order as ServiceOrder) : null,
)

async function changeStatus(status: AppointmentStatus): Promise<void> {
  if (!props.appointment) {
    return
  }
  actionError.value = null
  try {
    await updateStatusMutation.mutateAsync({ id: props.appointment.id, status })
    notify('Estado actualizado')
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos actualizar el estado.')
  }
}

async function changeOrderStage(stageId: number): Promise<void> {
  if (!linkedOrder.value || stageId === linkedOrder.value.stage_id) {
    return
  }
  actionError.value = null
  try {
    await setStageMutation.mutateAsync({ id: linkedOrder.value.id, stageId })
    notify('Etapa actualizada')
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos cambiar la etapa.')
  }
}

async function cancelAppointment(): Promise<void> {
  if (!props.appointment) {
    return
  }
  if (!window.confirm('¿Cancelar esta cita? Si tiene abonos registrados, se reembolsarán.')) {
    return
  }
  await changeStatus('cancelled')
}

// A diferencia de "Cancelar", esto no reembolsa ni cambia la orden de
// servicio vinculada (si la hay) - solo saca la cita del calendario, la
// orden y sus pagos quedan intactos (ver comentario en
// AppointmentController::destroy en el backend).
async function deleteAppointment(): Promise<void> {
  if (!props.appointment) {
    return
  }
  const warning = linkedOrder.value
    ? '¿Eliminar esta cita? La orden de servicio vinculada y sus pagos no se verán afectados.'
    : '¿Eliminar esta cita?'
  if (!window.confirm(warning)) {
    return
  }
  actionError.value = null
  try {
    await deleteMutation.mutateAsync(props.appointment.id)
    emit('update:modelValue', false)
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos eliminar la cita.')
  }
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="appointment ? appointment.client_name : 'Cita'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="appointment" class="flex flex-col gap-3 text-sm">
      <p v-if="actionError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ actionError }}</p>

      <p><span class="text-slate-500">Servicio:</span> {{ appointment.service?.name ?? '—' }}</p>
      <p><span class="text-slate-500">Horario:</span> {{ formatDateTime(appointment.starts_at) }} – {{ formatDateTime(appointment.ends_at) }}</p>
      <p v-if="appointment.staff?.id != null"><span class="text-slate-500">Personal:</span> {{ appointment.staff.name }}</p>
      <p v-if="appointment.client_phone"><span class="text-slate-500">Teléfono:</span> {{ appointment.client_phone }}</p>
      <p v-if="appointment.notes" class="border-t border-slate-100 pt-2"><span class="text-slate-500">Notas:</span> {{ appointment.notes }}</p>

      <div v-if="linkedOrder" class="rounded-lg bg-slate-50 px-3 py-2">
        <p class="text-slate-500">Orden de servicio: {{ formatCop(linkedOrder.total) }}</p>
        <p v-if="linkedOrder.balance > 0" class="font-semibold text-amber-600">Saldo pendiente: {{ formatCop(linkedOrder.balance) }}</p>
        <p v-else class="font-semibold text-emerald-600">Pagado</p>
        <p v-if="stageOptions.length"><span class="text-slate-500">Etapa:</span> <StageBadge :stage="linkedOrder.stage" class="ml-1" /></p>
      </div>

      <NxSelect
        v-if="linkedOrder && stageOptions.length && linkedOrder.status !== 'cancelled'"
        :model-value="linkedOrder.stage_id"
        :options="stageOptions"
        option-label="label"
        option-value="id"
        label="Mover a otra etapa"
        :disabled="setStageMutation.isPending.value"
        @update:model-value="changeOrderStage($event as number)"
      />

      <NxSelect
        :model-value="appointment.status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        label="Estado"
        @update:model-value="changeStatus($event as AppointmentStatus)"
      />

      <div class="flex flex-wrap gap-2 pt-2">
        <NxButton v-if="linkedOrder && linkedOrder.balance > 0" size="sm" @click="payModalOpen = true">Abonar</NxButton>
        <NxButton v-if="appointment.status !== 'completed'" variant="outline" size="sm" @click="editModalOpen = true">Editar</NxButton>
        <NxButton
          v-if="appointment.status !== 'completed' && appointment.status !== 'cancelled'"
          variant="outline"
          size="sm"
          @click="rescheduleModalOpen = true"
        >
          Reprogramar
        </NxButton>
        <NxButton v-if="appointment.status !== 'cancelled'" variant="outline" size="sm" @click="cancelAppointment">Cancelar</NxButton>
        <NxButton variant="danger" size="sm" :loading="deleteMutation.isPending.value" @click="deleteAppointment">
          Eliminar
        </NxButton>
      </div>
    </div>

    <AppointmentFormModal v-model="editModalOpen" :appointment="appointment" />
    <RescheduleAppointmentModal v-model="rescheduleModalOpen" :appointment="appointment" />
    <PayServiceOrderModal v-model="payModalOpen" :order="linkedOrder" />
  </NxModal>
</template>
