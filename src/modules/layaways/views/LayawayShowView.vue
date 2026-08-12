<script setup lang="ts">
// Detalle de un apartado - items, abonos, y las acciones de estado
// (abonar/completar/cambiar productos/cancelar). Puerto de
// Admin/Layaways/Show.vue del legacy.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import AddLayawayPaymentModal from '../components/AddLayawayPaymentModal.vue'
import EditLayawayItemsModal from '../components/EditLayawayItemsModal.vue'
import { useLayaway } from '../composables/useLayaway'
import { useLayawayMutations } from '../composables/useLayawayMutations'

const route = useRoute()
const router = useRouter()
const { notify } = useSystemAlert()

const layawayId = computed(() => (route.params.id ? Number(route.params.id) : null))
const layawayQuery = useLayaway(layawayId)
const layaway = computed(() => layawayQuery.data.value ?? null)

const { completeMutation, cancelMutation } = useLayawayMutations()
const actionError = ref<string | null>(null)

const payModalOpen = ref(false)
const editItemsModalOpen = ref(false)

async function completeLayaway(): Promise<void> {
  if (!layaway.value) {
    return
  }
  actionError.value = null
  try {
    await completeMutation.mutateAsync(layaway.value.id)
    notify('Apartado completado')
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos completar el apartado.')
  }
}

async function cancelLayaway(): Promise<void> {
  if (!layaway.value) {
    return
  }
  if (!window.confirm('¿Cancelar este apartado? Se liberará el stock reservado y se reembolsarán los abonos.')) {
    return
  }
  actionError.value = null
  try {
    await cancelMutation.mutateAsync(layaway.value.id)
    notify('Apartado cancelado')
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos cancelar el apartado.')
  }
}

function statusBadgeClass(): string {
  if (layaway.value?.status === 'completed') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (layaway.value?.status === 'cancelled') {
    return 'bg-slate-100 text-slate-500'
  }
  return 'bg-amber-100 text-amber-700'
}

function statusLabel(): string {
  if (layaway.value?.status === 'completed') {
    return 'Completado'
  }
  if (layaway.value?.status === 'cancelled') {
    return 'Cancelado'
  }
  return 'Pendiente'
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
        @click="router.push({ name: 'layaways.index' })"
      >
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="layaway ? `Apartado — ${layaway.customer_name || 'Cliente sin nombre'}` : 'Apartado'" icon="pi pi-bookmark" compact />
    </div>

    <template v-if="layawayQuery.isPending.value">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <template v-else-if="layaway">
      <p v-if="actionError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ actionError }}</p>

      <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span class="text-slate-500">Estado:</span>
          <span class="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadgeClass()">{{ statusLabel() }}</span>
        </p>
        <p><span class="text-slate-500">Cliente:</span> {{ layaway.customer_name || 'Sin nombre' }}</p>
        <p v-if="layaway.customer_phone"><span class="text-slate-500">Teléfono:</span> {{ layaway.customer_phone }}</p>
        <p><span class="text-slate-500">Total:</span> {{ formatCop(layaway.total) }}</p>
        <p v-if="layaway.notes" class="border-t border-slate-100 pt-2"><span class="text-slate-500">Notas:</span> {{ layaway.notes }}</p>
        <p v-if="layaway.status === 'cancelled' && layaway.cancelled_at" class="border-t border-slate-100 pt-2 text-slate-500">
          Cancelado el {{ formatDateTime(layaway.cancelled_at) }} — abonos reembolsados
        </p>
      </div>

      <div v-if="layaway.status === 'open'" class="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <p class="mb-3 text-sm font-semibold text-slate-800">
          <i class="pi pi-wallet mr-1 text-amber-600" />
          Saldo pendiente: {{ formatCop(layaway.balance) }}
        </p>
        <div class="flex flex-wrap gap-2">
          <NxButton v-if="layaway.balance > 0" @click="payModalOpen = true">Registrar abono</NxButton>
          <NxButton v-if="layaway.balance <= 0" variant="outline" :loading="completeMutation.isPending.value" @click="completeLayaway">
            Completar
          </NxButton>
          <NxButton variant="outline" @click="editItemsModalOpen = true">Cambiar productos</NxButton>
          <NxButton variant="outline" :loading="cancelMutation.isPending.value" @click="cancelLayaway">Cancelar apartado</NxButton>
        </div>
      </div>
      <div v-else-if="layaway.status === 'completed'" class="flex gap-2">
        <NxButton variant="outline" :loading="cancelMutation.isPending.value" @click="cancelLayaway">Cancelar apartado</NxButton>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[480px] text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left">Producto</th>
              <th class="px-4 py-3 text-right">Cant.</th>
              <th class="px-4 py-3 text-right">Precio unitario</th>
              <th class="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in layaway.items" :key="item.id">
              <td class="px-4 py-3">{{ item.product?.name ?? 'Producto' }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ item.quantity }}</td>
              <td class="px-4 py-3 text-right text-slate-500">{{ formatCop(item.unit_price) }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ formatCop(item.subtotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="layaway.payments.length" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
            <tr v-for="payment in layaway.payments" :key="payment.id">
              <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(payment.created_at) }}</td>
              <td class="px-4 py-3 text-right font-medium" :class="payment.amount < 0 ? 'text-red-600' : ''">
                {{ formatCop(payment.amount) }}
              </td>
              <td class="px-4 py-3 text-slate-500">{{ payment.payment_method }}</td>
              <td class="px-4 py-3 text-slate-500">{{ payment.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AddLayawayPaymentModal v-model="payModalOpen" :layaway="layaway" />
      <EditLayawayItemsModal v-model="editItemsModalOpen" :layaway="layaway" />
    </template>
  </div>
</template>
