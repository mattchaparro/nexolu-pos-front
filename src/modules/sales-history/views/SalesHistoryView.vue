<script setup lang="ts">
// Historial de ventas: listado paginado con filtros, puerto de
// Admin/Reports/SalesHistory.vue del legacy (admin.reports.sales). Backend
// ya existia (SalesReportController::history/historyExport) - solo faltaba
// esta pantalla.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SaleHistoryRow } from '@/types/salesHistory'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useSalesHistory } from '../composables/useSalesHistory'
import { fetchSalesHistoryCsv } from '../services/salesHistoryService'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const dateFrom = ref(todayIso())
const dateTo = ref(todayIso())
const status = ref('')
const paymentMethod = ref('')
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

watch([dateFrom, dateTo, status, paymentMethod], () => {
  page.value = 1
})

const filters = computed(() => ({
  status: status.value || undefined,
  payment_method: paymentMethod.value || undefined,
  search: search.value || undefined,
}))

const historyQuery = useSalesHistory(dateFrom, dateTo, page, filters)
const meta = computed(() => historyQuery.data.value?.meta)

const statusOptions = [
  { id: '', label: 'Todos los estados' },
  { id: 'closed', label: 'Cerradas' },
  { id: 'open', label: 'Abiertas' },
]

const paymentMethodOptions = computed(() => [
  { id: '', label: 'Todos los medios' },
  ...(historyQuery.data.value?.payment_method_options ?? []),
  { id: 'mixed', label: 'Varios (dividido)' },
])

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function setToday(): void {
  dateFrom.value = todayIso()
  dateTo.value = todayIso()
}

function setLast7Days(): void {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  dateFrom.value = start.toISOString().slice(0, 10)
  dateTo.value = end.toISOString().slice(0, 10)
}

function paymentLabel(row: SaleHistoryRow): string {
  if (row.payment_splits.length > 0) {
    return row.payment_splits.map((s) => paymentMethodOptions.value.find((m) => m.id === s.payment_method)?.label ?? s.payment_method).join(' + ')
  }
  return paymentMethodOptions.value.find((m) => m.id === row.payment_method)?.label ?? (row.payment_method ?? '—')
}

const { notify } = useSystemAlert()
const exporting = ref(false)

async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchSalesHistoryCsv(dateFrom.value, dateTo.value, filters.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ventas-${dateFrom.value}-a-${dateTo.value}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos exportar el historial de ventas.'), 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Historial de ventas" icon="pi pi-receipt" compact />

    <div class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <NxInput v-model="dateFrom" type="date" label="Desde" size="sm" class="w-40" />
      <NxInput v-model="dateTo" type="date" label="Hasta" size="sm" class="w-40" />
      <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="setToday">
        Hoy
      </button>
      <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="setLast7Days">
        Últimos 7 días
      </button>
      <NxSelect v-model="status" :options="statusOptions" option-label="label" option-value="id" label="Estado" size="sm" class="w-40" />
      <NxSelect
        v-model="paymentMethod"
        :options="paymentMethodOptions"
        option-label="label"
        option-value="id"
        label="Medio de pago"
        size="sm"
        class="w-48"
      />
      <NxInput v-model="searchInput" label="Buscar factura, cliente, teléfono" class="min-w-[220px] flex-1" icon="pi pi-search" clearable size="sm" />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" @click="exportCsv">Exportar CSV</NxButton>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="historyQuery.data.value?.data ?? []"
        :loading="historyQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin ventas en este rango con los filtros actuales.</p>
        </template>
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-sm text-slate-700">{{ data.created_at }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Factura">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-sm font-medium text-slate-900">{{ data.invoice_number ?? `#${data.id}` }}</p>
            <p v-if="data.table_name" class="text-xs text-slate-400">{{ data.table_name }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Cliente">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-sm text-slate-700">{{ data.customer_name || '—' }}</p>
            <p v-if="data.customer_phone" class="text-xs text-slate-400">{{ data.customer_phone }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Vendedor">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-sm text-slate-700">{{ data.user_name ?? '—' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Productos">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="max-w-xs truncate text-sm text-slate-600">{{ data.items_preview }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Medio de pago">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-sm text-slate-600">{{ paymentLabel(data) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Total">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-right text-sm font-semibold text-slate-900">{{ formatCop(data.total) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <div class="flex flex-wrap gap-1">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="data.status === 'closed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'"
              >
                {{ data.status === 'closed' ? 'Cerrada' : 'Abierta' }}
              </span>
              <span v-if="data.is_non_revenue" class="rounded-full bg-fuchsia-50 px-2 py-0.5 text-xs font-medium text-fuchsia-600">Cortesía</span>
              <span v-if="data.is_credit" class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Fiado</span>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
