<script setup lang="ts">
// Intentos de cobro de la suscripcion mensual contra el Nexolu Payments Core.
// Consume SuperAdmin\SubscriptionTransactionController (nexolu-pos-api).
//
// La tabla del legacy (SuperAdmin/SubscriptionTransactions/Index.vue) solo
// listaba las ordenes. Aca lo que importa es el RESULTADO del intento: que
// respondio la pasarela cuando rechazo un cobro, y cuales se quedaron a
// medias. Sin eso, un pago fallido es una fila roja sin explicacion y hay
// que ir a los logs del servidor.
import { computed, ref, watch } from 'vue'

import type { SubscriptionOrderStatus, SubscriptionTransaction } from '@/types/subscriptionTransaction'
import { NxCard, NxColumn, NxDataTable, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useSubscriptionTransactions } from '../composables/useSubscriptionTransactions'

const status = ref<string | null>(null)
const businessIdInput = ref('')
const searchInput = ref('')
const search = ref('')
const page = ref(1)

let debounce: number | undefined
watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})

const businessId = computed(() => {
  const parsed = Number.parseInt(businessIdInput.value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

watch([status, businessId], () => {
  page.value = 1
})

const statusOptions = [
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'failed', label: 'Fallidas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'cancelled', label: 'Canceladas' },
]

const transactionsQuery = useSubscriptionTransactions(status, businessId, search, page)
const meta = computed(() => transactionsQuery.data.value?.meta)
const summary = computed(() => transactionsQuery.data.value?.summary)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const statusBadge: Record<SubscriptionOrderStatus, { label: string; class: string }> = {
  confirmed: { label: 'Confirmada', class: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Fallida', class: 'bg-red-100 text-red-700' },
  pending: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  cancelled: { label: 'Cancelada', class: 'bg-slate-100 text-slate-600' },
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const expandedId = ref<number | null>(null)

function toggleDetails(row: SubscriptionTransaction): void {
  expandedId.value = expandedId.value === row.id ? null : row.id
}

function ordersOf(key: string): number {
  return summary.value?.by_status?.[key]?.orders ?? 0
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader
      title="Transacciones de suscripción"
      subtitle="Cobros de la suscripción mensual y qué respondió la pasarela a cada intento."
      icon="pi pi-receipt"
      compact
    />

    <div v-if="summary" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NxCard>
        <p class="text-xs font-medium text-slate-500">Recaudado</p>
        <p class="text-2xl font-bold text-slate-900">{{ formatCop(summary.collected_cop) }}</p>
        <!-- Solo lo confirmado: sumar pendientes y rechazados daria un
             "recaudo" que no existe. -->
        <p class="text-xs text-slate-400">{{ ordersOf('confirmed') }} cobros confirmados</p>
      </NxCard>
      <NxCard>
        <p class="text-xs font-medium text-slate-500">Tasa de éxito</p>
        <p class="text-2xl font-bold text-slate-900">
          {{ summary.success_rate_pct === null ? '—' : `${summary.success_rate_pct}%` }}
        </p>
        <p class="text-xs text-slate-400">sobre los intentos resueltos</p>
      </NxCard>
      <NxCard>
        <p class="text-xs font-medium text-slate-500">Rechazados</p>
        <p class="text-2xl font-bold text-slate-900">{{ ordersOf('failed') }}</p>
        <p class="text-xs text-slate-400">la pasarela dijo que no</p>
      </NxCard>
      <NxCard>
        <p class="text-xs font-medium text-slate-500">Sin resolver</p>
        <p class="text-2xl font-bold text-slate-900">{{ ordersOf('pending') }}</p>
        <p class="text-xs text-slate-400">checkouts abiertos y no terminados</p>
      </NxCard>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <NxSelect
        v-model="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        label="Estado"
        placeholder="Todos"
        class="min-w-[180px]"
        show-clear
      />
      <NxInput v-model="businessIdInput" label="ID de negocio" placeholder="Todos" class="w-32" />
      <NxInput
        v-model="searchInput"
        label="Buscar por referencia"
        class="min-w-[220px] flex-1"
        icon="pi pi-search"
        clearable
        blur-after-typing
      />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="transactionsQuery.data.value?.data ?? []"
        :loading="transactionsQuery.isPending.value"
        paginator
        lazy
        :rows="25"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 25"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">No hay cobros con esos criterios.</p>
        </template>

        <NxColumn header="Fecha">
          <template #body="{ data }: { data: SubscriptionTransaction }">
            <p class="text-sm text-slate-700">{{ formatDateTime(data.created_at) }}</p>
            <p v-if="data.confirmed_at" class="text-xs text-emerald-600">
              Confirmada {{ formatDateTime(data.confirmed_at) }}
            </p>
          </template>
        </NxColumn>

        <NxColumn header="Negocio">
          <template #body="{ data }: { data: SubscriptionTransaction }">
            <p class="text-sm font-semibold text-slate-900">{{ data.business?.name ?? '—' }}</p>
            <p v-if="data.business_id" class="font-mono text-xs text-slate-400">#{{ data.business_id }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Monto">
          <template #body="{ data }: { data: SubscriptionTransaction }">
            <p class="text-sm font-semibold text-slate-900">{{ formatCop(data.amount_cop) }}</p>
            <p class="text-xs text-slate-400">{{ data.subscription_days }} días</p>
            <p v-if="data.ai_addon_included" class="text-xs text-indigo-600">
              incluye IA{{ data.ai_addon_amount_cop ? ` (${formatCop(data.ai_addon_amount_cop)})` : '' }}
            </p>
          </template>
        </NxColumn>

        <NxColumn header="Estado">
          <template #body="{ data }: { data: SubscriptionTransaction }">
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadge[data.status].class">
              {{ statusBadge[data.status].label }}
            </span>
            <!-- Un pendiente viejo no es un cobro en vuelo: la pasarela
                 responde en segundos. -->
            <p v-if="data.pending_stale" class="mt-0.5 text-xs text-slate-400">Sin respuesta, abandonada</p>
          </template>
        </NxColumn>

        <NxColumn header="Respuesta de la pasarela">
          <template #body="{ data }: { data: SubscriptionTransaction }">
            <p v-if="data.provider_status" class="font-mono text-sm text-slate-700">{{ data.provider_status }}</p>
            <p v-else class="text-sm text-slate-400">Sin respuesta todavía</p>
            <p v-if="data.provider_event" class="font-mono text-xs text-slate-400">{{ data.provider_event }}</p>
            <p v-if="data.net_amount_cop !== null" class="text-xs text-slate-500">
              Neto {{ formatCop(data.net_amount_cop) }}
              <span v-if="data.fee_cop">· comisión {{ formatCop(data.fee_cop) }}</span>
            </p>
            <button
              v-if="data.payload"
              type="button"
              class="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              @click="toggleDetails(data)"
            >
              {{ expandedId === data.id ? 'Ocultar respuesta' : 'Ver respuesta completa' }}
            </button>
            <pre
              v-if="expandedId === data.id"
              class="mt-2 max-w-md overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600"
            >{{ JSON.stringify(data.payload, null, 2) }}</pre>
            <p v-if="expandedId === data.id" class="mt-1 font-mono text-xs text-slate-400">
              {{ data.provider ?? 'sin proveedor' }} · {{ data.order_key }}
              <span v-if="data.provider_order_id"> · {{ data.provider_order_id }}</span>
            </p>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
