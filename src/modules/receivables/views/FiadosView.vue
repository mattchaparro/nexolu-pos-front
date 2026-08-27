<script setup lang="ts">
// Fiados - listado con filtro de estado + busqueda + accion de cobro.
// Puerto de Admin/Receivables/Index.vue del legacy. Un fiado nunca se crea
// aca (nace de una venta a credito, ver ReceivableService::collect() y la
// nota en types/receivable.ts) - esta pantalla solo lista y cobra.
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import PaymentModal from '@/modules/sales/components/PaymentModal.vue'
import type { CloseOpenTabPayload } from '@/modules/open-tabs/types'
import type { Receivable, ReceivableStatus } from '@/types/receivable'
import { NxColumn, NxDataTable, NxDatePicker, NxInput, NxPageHeader, NxSelect, NxStatCard } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useReceivableMutations } from '../composables/useReceivableMutations'
import { useReceivables } from '../composables/useReceivables'
import { useReceivablesSummary } from '../composables/useReceivablesSummary'

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Cobrados', value: 'paid' },
]

const status = ref<ReceivableStatus | ''>('pending')
const searchInput = ref('')
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
let debounce: number | undefined

watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})
watch([status, dateFrom, dateTo], () => {
  page.value = 1
})

const receivablesQuery = useReceivables(status, search, page, dateFrom, dateTo)
const meta = computed(() => receivablesQuery.data.value?.meta)

const summaryQuery = useReceivablesSummary()

function togglePendingFilter(): void {
  status.value = status.value === 'pending' ? '' : 'pending'
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const { collectMutation } = useReceivableMutations()

const collectModalOpen = ref(false)
const collectingReceivable = ref<Receivable | null>(null)
const collectError = ref<string | null>(null)

function openCollect(receivable: Receivable): void {
  collectingReceivable.value = receivable
  collectError.value = null
  collectModalOpen.value = true
}

async function submitCollect(payload: CloseOpenTabPayload): Promise<void> {
  if (!collectingReceivable.value || !payload.payment_method) {
    return
  }
  collectError.value = null
  try {
    await collectMutation.mutateAsync({
      id: collectingReceivable.value.id,
      payload: {
        payment_method: payload.payment_method,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        customer_identification: payload.customer_identification,
      },
    })
    notify('Fiado cobrado')
    collectModalOpen.value = false
  } catch (error) {
    // Banner en la pantalla, no toast - mismo patron que OpenTabsView/
    // SellView con sus respectivos PaymentModal (el modal sigue abierto
    // tras un error, el toast quedaria tapado detras de el).
    collectError.value = extractErrorMessage(error, 'No pudimos cobrar el fiado.')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Fiados" icon="pi pi-wallet" compact />

    <p v-if="collectError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ collectError }}</p>

    <div v-if="summaryQuery.data.value" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <NxStatCard
        label="Fiados pendientes"
        :value="String(summaryQuery.data.value.pending_count)"
        icon="pi pi-clock"
        clickable
        :active="status === 'pending'"
        @click="togglePendingFilter"
      />
      <NxStatCard label="Saldo pendiente" :value="formatCop(summaryQuery.data.value.pending_amount)" icon="pi pi-wallet" />
      <NxStatCard label="Cobrados este mes" :value="String(summaryQuery.data.value.collected_this_month_count)" icon="pi pi-check-circle" />
      <NxStatCard
        label="Cobrado este mes"
        :value="formatCop(summaryQuery.data.value.collected_this_month_amount)"
        icon="pi pi-money-bill"
      />
    </div>

    <div class="flex flex-wrap gap-3">
      <NxInput
        v-model="searchInput"
        label="Buscar por cliente, teléfono o cédula"
        class="min-w-[220px] flex-1"
        icon="pi pi-search"
        clearable
        blur-after-typing
      />
      <NxSelect
        :model-value="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        label="Estado"
        class="min-w-[180px]"
        @update:model-value="status = $event as ReceivableStatus | ''"
      />
      <NxDatePicker v-model="dateFrom" label="Desde" class="min-w-[160px]" />
      <NxDatePicker v-model="dateTo" label="Hasta" class="min-w-[160px]" />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="receivablesQuery.data.value?.data ?? []"
        :loading="receivablesQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">
            {{ status === 'pending' ? 'No hay fiados pendientes.' : 'Todavía no hay fiados.' }}
          </p>
        </template>
        <NxColumn header="Cliente">
          <template #body="{ data }: { data: Receivable }">
            <p class="text-sm font-semibold text-slate-900">{{ data.customer_name || 'Sin nombre' }}</p>
            <p v-if="data.customer_phone" class="text-xs text-slate-400">{{ data.customer_phone }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Monto / Saldo">
          <template #body="{ data }: { data: Receivable }">
            <p class="text-sm font-semibold text-slate-900">{{ formatCop(data.amount) }}</p>
            <p v-if="data.status === 'pending'" class="text-xs font-semibold text-amber-600">
              Saldo: {{ formatCop(data.balance) }}
            </p>
            <p v-else class="text-xs font-semibold text-emerald-600">Cobrado {{ formatDate(data.paid_at) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: Receivable }">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="data.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
            >
              {{ data.status === 'paid' ? 'Cobrado' : 'Pendiente' }}
            </span>
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: Receivable }">
            <div class="flex items-center justify-end">
              <button
                v-if="data.status === 'pending'"
                type="button"
                class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                @click="openCollect(data)"
              >
                Cobrar
              </button>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <PaymentModal
      v-if="business"
      v-model="collectModalOpen"
      :business="business"
      :submitting="collectMutation.isPending.value"
      :sale="null"
      receivable-mode
      :fallback-charge-base="Number(collectingReceivable?.balance ?? 0)"
      :title="collectingReceivable ? `Cobrar fiado — ${collectingReceivable.customer_name || 'Cliente sin nombre'}` : 'Cobrar fiado'"
      :existing-customer-name="collectingReceivable?.customer_name ?? null"
      :existing-customer-phone="collectingReceivable?.customer_phone ?? null"
      :existing-customer-identification="collectingReceivable?.customer_identification ?? null"
      @confirm="submitCollect"
    />
  </div>
</template>
