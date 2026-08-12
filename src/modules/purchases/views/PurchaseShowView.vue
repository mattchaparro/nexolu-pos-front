<script setup lang="ts">
// Detalle de una compra - lineas, abonos, y accion de abonar si quedo a
// credito. Puerto de Admin/Purchases/Show.vue del legacy.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { Purchase } from '@/types/purchase'
import { NxButton, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import PayPurchaseModal from '../components/PayPurchaseModal.vue'
import { usePurchase } from '../composables/usePurchase'

const route = useRoute()
const router = useRouter()

const purchaseId = computed(() => (route.params.id ? Number(route.params.id) : null))
const purchaseQuery = usePurchase(purchaseId)
const purchase = computed(() => purchaseQuery.data.value ?? null)

const payModalOpen = ref(false)

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function lineItemName(line: Purchase['lines'][number]): string {
  if (line.product?.id != null) {
    return line.product.name ?? ''
  }
  return line.ingredient?.name ?? ''
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        @click="router.push({ name: 'purchases.index' })"
      >
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="purchase ? `Compra · ${formatDate(purchase.purchased_at)}` : 'Compra'" icon="pi pi-shopping-cart" compact />
    </div>

    <template v-if="purchaseQuery.isPending.value">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <template v-else-if="purchase">
      <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span class="text-slate-500">Estado:</span>
          <span
            v-if="purchase.payment_status === 'paid'"
            class="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
          >
            Pagada
          </span>
          <span v-else class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            A crédito · debes {{ formatCop(purchase.balance) }}
          </span>
        </p>
        <p><span class="text-slate-500">Proveedor:</span> {{ purchase.supplier?.id ? purchase.supplier.name : 'Sin proveedor' }}</p>
        <p v-if="purchase.invoice_number"><span class="text-slate-500">Factura:</span> {{ purchase.invoice_number }}</p>
        <p><span class="text-slate-500">Total de la compra:</span> {{ formatCop(purchase.total) }}</p>
        <p v-if="purchase.notes" class="border-t border-slate-100 pt-2"><span class="text-slate-500">Notas:</span> {{ purchase.notes }}</p>
      </div>

      <div v-if="purchase.payment_status !== 'paid'" class="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <p class="mb-2 text-sm font-semibold text-slate-800">
          <i class="pi pi-wallet mr-1 text-amber-600" />
          Saldo pendiente: {{ formatCop(purchase.balance) }}
        </p>
        <NxButton @click="payModalOpen = true">Abonar</NxButton>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[560px] text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left">Ítem</th>
              <th class="px-4 py-3 text-right">Cant.</th>
              <th class="px-4 py-3 text-right">Total pagado</th>
              <th class="px-4 py-3 text-right">Costo unitario</th>
              <th class="px-4 py-3 text-left">Observación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="line in purchase.lines" :key="line.id">
              <td class="px-4 py-3">
                {{ lineItemName(line) }}
                <span v-if="line.ingredient?.id != null" class="text-xs text-slate-400"> ({{ line.ingredient.unit }})</span>
              </td>
              <td class="px-4 py-3 text-right font-medium">{{ line.quantity }}</td>
              <td class="px-4 py-3 text-right">{{ formatCop(line.line_total_cop) }}</td>
              <td class="px-4 py-3 text-right text-slate-500">{{ formatCop(line.unit_cost_cop) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ line.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="purchase.payments.length" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <p class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Historial de abonos</p>
        <table class="w-full min-w-[420px] text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left">Fecha</th>
              <th class="px-4 py-3 text-right">Monto</th>
              <th class="px-4 py-3 text-left">Método</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="payment in purchase.payments" :key="payment.id">
              <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(payment.created_at) }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ formatCop(payment.amount) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ payment.payment_method }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PayPurchaseModal v-model="payModalOpen" :purchase="purchase" />
    </template>
  </div>
</template>
