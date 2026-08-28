<script setup lang="ts">
// Historial de ventas: listado paginado con filtros, puerto de
// Admin/Reports/SalesHistory.vue del legacy (admin.reports.sales). Backend
// ya existia (SalesReportController::history/historyExport) - solo faltaba
// esta pantalla.
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import type { DataTableSortEvent } from 'primevue/datatable'
import { useRoute } from 'vue-router'

import { usePermissions } from '@/composables/usePermissions'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useOpenTabMutations } from '@/modules/open-tabs/composables/useOpenTabMutations'
import { useSaleMutations } from '@/modules/sales/composables/useSaleMutations'
import type { SaleHistoryRow } from '@/types/salesHistory'
import { NxButton, NxColumn, NxDataTable, NxDatePicker, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useSalesHistory } from '../composables/useSalesHistory'
import { fetchSalesHistoryCsv } from '../services/salesHistoryService'

// from/to en la query: atajo de Resumen del dia, que linkea aca con el
// rango que el usuario tenia elegido en esa pantalla (ver DailySummaryView.vue).
const route = useRoute()
const queryFrom = typeof route.query.from === 'string' ? route.query.from : null
const queryTo = typeof route.query.to === 'string' ? route.query.to : null

const dateFrom = ref(queryFrom ?? toLocalDateIso())
const dateTo = ref(queryTo ?? toLocalDateIso())
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

// Claves publicas que acepta el backend (ver SalesReportService::salesHistory()
// en nexolu-pos-api) - "date"/"total"/"status", no columnas reales.
const sortField = ref<string | undefined>(undefined)
const sortOrder = ref<number | null>(null)

watch([dateFrom, dateTo, status, paymentMethod, sortField, sortOrder], () => {
  page.value = 1
})

const filters = computed(() => ({
  status: status.value || undefined,
  payment_method: paymentMethod.value || undefined,
  search: search.value || undefined,
  sort: sortField.value,
  direction: sortOrder.value === 1 ? ('asc' as const) : sortOrder.value === -1 ? ('desc' as const) : undefined,
}))

function onSort(event: DataTableSortEvent): void {
  sortField.value = typeof event.sortField === 'string' ? event.sortField : undefined
  sortOrder.value = event.sortOrder ?? null
}

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
  dateFrom.value = toLocalDateIso()
  dateTo.value = toLocalDateIso()
}

function setLast7Days(): void {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  dateFrom.value = toLocalDateIso(start)
  dateTo.value = toLocalDateIso(end)
}

function paymentLabel(row: SaleHistoryRow): string {
  if (row.payment_splits.length > 0) {
    return row.payment_splits.map((s) => paymentMethodOptions.value.find((m) => m.id === s.payment_method)?.label ?? s.payment_method).join(' + ')
  }
  return paymentMethodOptions.value.find((m) => m.id === row.payment_method)?.label ?? (row.payment_method ?? '—')
}

const { notify } = useSystemAlert()
const exporting = ref(false)

const { hasPermission } = usePermissions()
const canReverse = computed(() => hasPermission('sales.reverse'))
const { reverseMutation } = useSaleMutations()
const { deleteMutation: deleteOpenTabMutation } = useOpenTabMutations()
const queryClient = useQueryClient()

const reversingId = ref<number | null>(null)

async function reverseSaleRow(row: SaleHistoryRow): Promise<void> {
  const confirmText =
    row.status === 'closed'
      ? 'Se restaurará el stock y la venta se eliminará permanentemente. ¿Continuar?'
      : '¿Cancelar esta cuenta abierta? Se restaurará el stock reservado.'
  if (!window.confirm(confirmText)) {
    return
  }
  reversingId.value = row.id
  try {
    if (row.status === 'closed') {
      await reverseMutation.mutateAsync(row.id)
    } else {
      // deleteMutation (useOpenTabMutations) invalida tables/open-tabs/products/dashboard
      // pero no sales-history - esta vista necesita su propia invalidacion.
      await deleteOpenTabMutation.mutateAsync(row.id)
      queryClient.invalidateQueries({ queryKey: ['sales-history'] })
    }
    notify('Venta reversada correctamente')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos reversar la venta.'), 'error')
  } finally {
    reversingId.value = null
  }
}

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

    <div class="grid grid-cols-2 items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex lg:flex-wrap">
      <NxDatePicker v-model="dateFrom" label="Desde" class="w-full lg:w-40" />
      <NxDatePicker v-model="dateTo" label="Hasta" class="w-full lg:w-40" />
      <NxButton variant="outline" class="w-full lg:w-auto" @click="setToday">Hoy</NxButton>
      <NxButton variant="outline" class="w-full lg:w-auto" @click="setLast7Days">Últimos 7 días</NxButton>
      <NxSelect v-model="status" :options="statusOptions" option-label="label" option-value="id" label="Estado" class="w-full lg:w-40" />
      <NxSelect
        v-model="paymentMethod"
        :options="paymentMethodOptions"
        option-label="label"
        option-value="id"
        label="Medio de pago"
        class="w-full lg:w-48"
      />
      <NxInput
        v-model="searchInput"
        label="Buscar factura, cliente, teléfono o producto"
        class="col-span-2 lg:min-w-[220px] lg:flex-1"
        icon="pi pi-search"
        clearable
      />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" class="col-span-2 justify-self-end" @click="exportCsv">Exportar CSV</NxButton>
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
        :sort-field="sortField"
        :sort-order="sortOrder"
        @page="onPage"
        @sort="onSort"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin ventas en este rango con los filtros actuales.</p>
        </template>
        <NxColumn header="Fecha" field="date" sortable>
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
        <NxColumn header="Total" field="total" sortable>
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-right text-sm font-semibold text-slate-900">{{ formatCop(data.total) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Estado" field="status" sortable>
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
        <NxColumn v-if="canReverse" header="Acciones">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <NxButton
              size="sm"
              variant="outline"
              icon="pi pi-replay"
              :loading="reversingId === data.id"
              @click="reverseSaleRow(data)"
            >
              Reversar
            </NxButton>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
