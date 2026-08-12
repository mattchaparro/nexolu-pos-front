<script setup lang="ts">
// Detalle de una orden de servicio - items o total plano, abonos, y las
// acciones de estado (abonar/editar/cancelar). Puerto de
// Admin/ServiceOrders/Show.vue del legacy (sin el menu de "eliminar
// permanentemente": esta API no tiene esa accion, solo cancelar).
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ReceiptActionsModal from '@/components/ReceiptActionsModal.vue'
import StageBadge from '@/components/StageBadge.vue'
import { useServiceWorkflow } from '@/composables/useServiceWorkflow'
import { useStaffOptions } from '@/composables/useStaffOptions'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxPageHeader, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import PayServiceOrderModal from '../components/PayServiceOrderModal.vue'
import { useServiceOrder } from '../composables/useServiceOrder'
import { useServiceOrderMutations } from '../composables/useServiceOrderMutations'

const route = useRoute()
const router = useRouter()
const { notify } = useSystemAlert()

const orderId = computed(() => (route.params.id ? Number(route.params.id) : null))
const orderQuery = useServiceOrder(orderId)
const order = computed(() => orderQuery.data.value ?? null)
const staffQuery = useStaffOptions()
const workflowQuery = useServiceWorkflow()
const stageOptions = computed(() => workflowQuery.data.value?.stages ?? [])

const { cancelMutation, setStageMutation } = useServiceOrderMutations()
const actionError = ref<string | null>(null)
const payModalOpen = ref(false)
const receiptModalOpen = ref(false)

async function changeStage(stageId: number): Promise<void> {
  if (!order.value || stageId === order.value.stage_id) {
    return
  }
  actionError.value = null
  try {
    await setStageMutation.mutateAsync({ id: order.value.id, stageId })
    notify('Etapa actualizada')
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos cambiar la etapa.')
  }
}

// ServiceOrderItem::quantity es decimal:2 en el backend (a diferencia de
// LayawayItem, entero) - llega como string "1.00"; Number() + toString()
// para no mostrar ceros de mas en cantidades enteras.
function quantityLabel(quantity: number): string {
  return Number(quantity).toString()
}

function staffName(userId: number | null): string {
  if (userId === null) {
    return '—'
  }
  return staffQuery.data.value?.find((s) => s.id === userId)?.name ?? '—'
}

async function cancelOrder(): Promise<void> {
  if (!order.value) {
    return
  }
  if (!window.confirm('¿Cancelar esta orden? Se reembolsarán los abonos registrados.')) {
    return
  }
  actionError.value = null
  try {
    await cancelMutation.mutateAsync(order.value.id)
    notify('Orden cancelada')
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos cancelar la orden.')
  }
}

function statusBadgeClass(): string {
  if (order.value?.status === 'paid') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (order.value?.status === 'cancelled') {
    return 'bg-slate-100 text-slate-500'
  }
  if (order.value?.status === 'partial') {
    return 'bg-sky-100 text-sky-700'
  }
  return 'bg-amber-100 text-amber-700'
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        @click="router.push({ name: 'service-orders.index' })"
      >
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="order ? order.service_name : 'Orden de servicio'" icon="pi pi-wrench" compact />
    </div>

    <template v-if="orderQuery.isPending.value">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <template v-else-if="order">
      <p v-if="actionError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ actionError }}</p>

      <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span class="text-slate-500">Estado:</span>
          <span class="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadgeClass()">{{ order.status_label }}</span>
        </p>
        <p v-if="order.client?.id != null"><span class="text-slate-500">Cliente:</span> {{ order.client.name }}</p>
        <p><span class="text-slate-500">Total:</span> {{ formatCop(order.total) }}</p>
        <p v-if="stageOptions.length"><span class="text-slate-500">Etapa:</span> <StageBadge :stage="order.stage" class="ml-1" /></p>
        <p v-if="order.notes" class="border-t border-slate-100 pt-2"><span class="text-slate-500">Notas:</span> {{ order.notes }}</p>
      </div>

      <NxSelect
        v-if="stageOptions.length && order.status !== 'cancelled'"
        :model-value="order.stage_id"
        :options="stageOptions"
        option-label="label"
        option-value="id"
        label="Mover a otra etapa"
        :disabled="setStageMutation.isPending.value"
        class="max-w-xs"
        @update:model-value="changeStage($event as number)"
      />

      <div class="flex flex-wrap gap-2">
        <template v-if="order.status !== 'cancelled'">
          <NxButton v-if="order.status !== 'paid'" @click="payModalOpen = true">Registrar abono</NxButton>
          <NxButton variant="outline" @click="router.push({ name: 'service-orders.edit', params: { id: order.id } })">Editar</NxButton>
          <NxButton variant="outline" :loading="cancelMutation.isPending.value" @click="cancelOrder">Cancelar orden</NxButton>
        </template>
        <NxButton variant="outline" icon="pi pi-receipt" @click="receiptModalOpen = true">Comprobante</NxButton>
      </div>

      <div v-if="order.items.length" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[560px] text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left">Ítem</th>
              <th class="px-4 py-3 text-right">Cant.</th>
              <th class="px-4 py-3 text-right">Precio unitario</th>
              <th class="px-4 py-3 text-right">Subtotal</th>
              <th class="px-4 py-3 text-left">Atendió</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in order.items" :key="item.id">
              <td class="px-4 py-3">
                {{ item.name }}
                <span v-if="item.notes" class="block text-xs text-slate-400">{{ item.notes }}</span>
              </td>
              <td class="px-4 py-3 text-right font-medium">{{ quantityLabel(item.quantity) }}</td>
              <td class="px-4 py-3 text-right text-slate-500">{{ formatCop(item.unit_price) }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ formatCop(item.subtotal) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ staffName(item.user_id) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="order.payments.length" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <p class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Historial de abonos</p>
        <table class="w-full min-w-[420px] text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left">Fecha</th>
              <th class="px-4 py-3 text-right">Monto</th>
              <th class="px-4 py-3 text-left">Método</th>
              <th class="px-4 py-3 text-left">Nota</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="payment in order.payments" :key="payment.id">
              <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(payment.created_at) }}</td>
              <td class="px-4 py-3 text-right font-medium" :class="Number(payment.amount) < 0 ? 'text-red-600' : ''">
                {{ formatCop(payment.amount) }}
              </td>
              <td class="px-4 py-3 text-slate-500">{{ payment.payment_method }}</td>
              <td class="px-4 py-3 text-slate-500">{{ payment.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PayServiceOrderModal v-model="payModalOpen" :order="order" />
      <ReceiptActionsModal
        v-model="receiptModalOpen"
        entity-type="service-order"
        :entity-id="order.id"
        document-title="Comprobante de orden de servicio"
        :default-phone="order.client?.phone ?? null"
        :default-email="order.client?.email ?? null"
      />
    </template>
  </div>
</template>
