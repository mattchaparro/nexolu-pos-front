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
import { NxButton, NxColumn, NxDataTable, NxDateRangePicker, NxInput, NxPageHeader, NxSelect } from '@/ui'
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

// Contra TODOS los ids configurados (habilitados o no), no solo las
// opciones del dropdown de filtro - una fila puede ser una venta vieja con
// un medio que el negocio ya desactivo, y aun asi debe mostrar su label
// real, no el id crudo.
const paymentMethodLabels = computed(() => historyQuery.data.value?.payment_method_labels ?? {})

function methodLabel(method: string): string {
  return paymentMethodLabels.value[method] ?? method
}

const expandedRows = ref<Record<string, boolean>>({})

// "2 Cerveza, Papas, 3 Agua": lo que se vendio, de un vistazo, sin abrir la fila.
function itemsSummary(row: SaleHistoryRow): string {
  if (row.items.length === 0) {
    return 'Sin productos'
  }
  return row.items.map((item) => (item.quantity > 1 ? `${item.quantity} ${item.name}` : item.name)).join(', ')
}

function paymentLabel(row: SaleHistoryRow): string {
  if (row.payment_splits.length > 0) {
    return row.payment_splits.map((s) => paymentMethodLabels.value[s.payment_method] ?? s.payment_method).join(' + ')
  }
  return (row.payment_method && paymentMethodLabels.value[row.payment_method]) ?? (row.payment_method ?? '—')
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
      <NxDateRangePicker v-model:from="dateFrom" v-model:to="dateTo" class="col-span-2 lg:w-64" />
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
        v-model:expanded-rows="expandedRows"
        :value="historyQuery.data.value?.data ?? []"
        :loading="historyQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        :sort-field="sortField"
        :sort-order="sortOrder"
        data-key="id"
        @page="onPage"
        @sort="onSort"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin ventas en este rango con los filtros actuales.</p>
        </template>
        <NxColumn expander style="width: 2.5rem" />
        <NxColumn header="Fecha" field="date" sortable>
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-sm text-slate-700">{{ data.created_at }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Productos">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="line-clamp-2 min-w-[12rem] max-w-[26rem] text-sm text-slate-900">{{ itemsSummary(data) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Valor" field="total" sortable>
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-right text-sm font-semibold text-slate-900">{{ formatCop(data.total) }}</p>
            <div class="flex flex-wrap justify-end gap-1">
              <span v-if="data.status !== 'closed'" class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Abierta</span>
              <span v-if="data.is_non_revenue" class="rounded-full bg-fuchsia-50 px-2 py-0.5 text-xs font-medium text-fuchsia-600">Cortesía</span>
              <span v-if="data.is_credit" class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Fiado</span>
            </div>
          </template>
        </NxColumn>
        <NxColumn header="Vendedor">
          <template #body="{ data }: { data: SaleHistoryRow }">
            <p class="text-sm text-slate-700">{{ data.user_name ?? '—' }}</p>
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
        <template #expansion="{ data }: { data: SaleHistoryRow }">
          <div class="grid gap-4 px-4 py-2 text-xs text-slate-600 sm:grid-cols-3">
            <div>
              <p class="mb-1 font-semibold text-slate-700">Productos</p>
              <p v-for="(item, idx) in data.items" :key="idx" class="flex justify-between gap-3">
                <span>
                  {{ item.name }}
                  <span v-if="item.is_deleted" class="text-red-400">(eliminado)</span>
                  <span class="text-slate-400">x{{ item.quantity }}</span>
                </span>
                <span>{{ formatCop(item.subtotal) }}</span>
              </p>
              <p v-if="data.items.length === 0" class="text-slate-400">Sin productos.</p>
            </div>
            <div>
              <p class="mb-1 font-semibold text-slate-700">Pago</p>
              <template v-if="data.payment_splits.length > 0">
                <p v-for="(split, idx) in data.payment_splits" :key="idx" class="flex justify-between gap-3">
                  <span>{{ methodLabel(split.payment_method) }}</span>
                  <span>{{ formatCop(split.amount) }}</span>
                </p>
                <p class="mt-1 flex justify-between gap-3 border-t border-slate-200 pt-1 font-semibold text-slate-800">
                  <span>Total</span>
                  <span>{{ formatCop(data.total) }}</span>
                </p>
              </template>
              <p v-else>{{ paymentLabel(data) }}</p>
            </div>
            <div>
              <p class="mb-1 font-semibold text-slate-700">Datos</p>
              <p>Factura: {{ data.invoice_number ?? `#${data.id}` }}</p>
              <p>Cliente: {{ data.customer_name || '—' }}</p>
              <p v-if="data.customer_phone">Teléfono: {{ data.customer_phone }}</p>
              <p v-if="data.table_name">Mesa: {{ data.table_name }}</p>
            </div>
          </div>
        </template>
      </NxDataTable>
    </div>
  </div>
</template>
