<script setup lang="ts">
// Reporte de proveedores: cuanto se le compra a cada uno y mes a mes, con el
// detalle de cada linea. Mismo esquema que los demas reportes (filtros +
// exportar arriba, tarjetas de totales, tablas). Por defecto los ultimos 6
// meses: un mes solo no deja ver cuanto se le compra "al mes".
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SupplierReportFilters, SupplierReportLine, SupplierReportSupplier } from '@/types/supplierReport'
import { NxButton, NxColumn, NxDataTable, NxDateRangePicker, NxPageHeader, NxSelect, NxStatCard } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useSupplierOptions } from '../../purchases/composables/usePurchaseFormOptions'
import MonthlyPurchasesBars from '../components/MonthlyPurchasesBars.vue'
import { useSupplierReport } from '../composables/useSupplierReport'
import { fetchSupplierReportCsv } from '../services/supplierReportService'

const today = new Date()
const dateFrom = ref(toLocalDateIso(new Date(today.getFullYear(), today.getMonth() - 5, 1)))
const dateTo = ref(toLocalDateIso(today))
const supplierId = ref<number | 'none' | null>(null)
const page = ref(1)

const filters = computed<SupplierReportFilters>(() => ({
  from: dateFrom.value,
  to: dateTo.value,
  supplierId: supplierId.value,
}))
watch(filters, () => (page.value = 1))

const reportQuery = useSupplierReport(filters, page)
const report = computed(() => reportQuery.data.value)
const totals = computed(() => report.value?.totals)

const suppliersQuery = useSupplierOptions()
const supplierOptions = computed(() => [
  { id: null, name: 'Todos los proveedores' },
  { id: 'none', name: 'Sin proveedor' },
  ...(suppliersQuery.data.value ?? []),
])

/**
 * Meses calendario que toca el rango de fechas (inclusive). El promedio se
 * divide entre estos y no entre los meses con compras: a un proveedor al que
 * se le compra cada dos meses no se le compra "eso" al mes, sino la mitad.
 */
const monthsInRange = computed(() => {
  if (!dateFrom.value || !dateTo.value) {
    return totals.value?.month_count ?? 0
  }
  const [fromYear, fromMonth] = dateFrom.value.split('-').map(Number)
  const [toYear, toMonth] = dateTo.value.split('-').map(Number)
  return Math.max(1, (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1)
})

const monthlyAverage = computed(() =>
  totals.value && monthsInRange.value > 0 ? totals.value.total_cop / monthsInRange.value : 0,
)

/** Tocar un proveedor de la tabla filtra el reporte por el. */
function selectSupplier(row: SupplierReportSupplier): void {
  supplierId.value = row.supplier_id ?? 'none'
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

const { notify } = useSystemAlert()
const exporting = ref(false)

async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchSupplierReportCsv(filters.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `compras-proveedores-${dateFrom.value}-a-${dateTo.value}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos exportar el reporte de proveedores.'), 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Proveedores" icon="pi pi-truck" compact />

    <div class="grid grid-cols-2 items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex lg:flex-wrap">
      <!-- Envuelto: el FloatLabel de un campo "fluid" trae width: 100% de
           PrimeVue y le gana a las clases de ancho (ver PurchasesView). -->
      <div class="col-span-2 lg:w-64">
        <NxDateRangePicker v-model:from="dateFrom" v-model:to="dateTo" />
      </div>
      <NxSelect
        :model-value="supplierId"
        :options="supplierOptions"
        option-label="name"
        option-value="id"
        filter
        class="col-span-2 lg:w-60"
        @update:model-value="supplierId = $event as number | 'none' | null"
      />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" class="col-span-2 justify-self-end lg:ml-auto" @click="exportCsv">
        Exportar CSV
      </NxButton>
    </div>

    <div v-if="totals" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NxStatCard label="Total comprado" :value="formatCop(totals.total_cop)" icon="pi pi-dollar" />
      <NxStatCard label="Promedio por mes" :value="formatCop(monthlyAverage)" icon="pi pi-calendar" />
      <NxStatCard label="Compras" :value="String(totals.purchase_count)" icon="pi pi-shopping-cart" />
      <NxStatCard label="Proveedores" :value="String(totals.supplier_count)" icon="pi pi-truck" />
    </div>

    <div class="grid gap-4 lg:grid-cols-5">
      <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h3 class="mb-1 text-sm font-semibold text-slate-700">Compras por mes</h3>
        <p class="mb-3 text-xs text-slate-400">
          {{ supplierId === null ? 'A todos los proveedores' : 'Al proveedor elegido' }}, mes a mes.
        </p>
        <MonthlyPurchasesBars :months="report?.by_month ?? []" />
      </section>

      <section class="overflow-x-auto rounded-xl border border-slate-200 bg-white lg:col-span-3">
        <div class="px-4 pt-4">
          <h3 class="text-sm font-semibold text-slate-700">Por proveedor</h3>
          <p class="text-xs text-slate-400">Toca un proveedor para ver solo sus compras.</p>
        </div>
        <NxDataTable
          :value="report?.by_supplier ?? []"
          :loading="reportQuery.isPending.value"
          @row-click="selectSupplier($event.data as SupplierReportSupplier)"
        >
          <template #empty>
            <p class="py-6 text-center text-sm text-slate-400">Sin compras en este período.</p>
          </template>
          <NxColumn header="Proveedor" field="supplier_name" sortable>
            <template #body="{ data }: { data: SupplierReportSupplier }">
              <p class="cursor-pointer text-sm font-medium text-slate-900 hover:text-indigo-600">{{ data.supplier_name }}</p>
            </template>
          </NxColumn>
          <NxColumn header="Compras" field="purchase_count" sortable>
            <template #body="{ data }: { data: SupplierReportSupplier }">
              <p class="text-sm text-slate-700">{{ data.purchase_count }}</p>
            </template>
          </NxColumn>
          <NxColumn header="% del total" field="pct_of_total" sortable>
            <template #body="{ data }: { data: SupplierReportSupplier }">
              <p class="text-sm text-slate-700">{{ data.pct_of_total !== null ? `${data.pct_of_total}%` : '—' }}</p>
            </template>
          </NxColumn>
          <NxColumn header="Última compra" field="last_purchase_at" sortable>
            <template #body="{ data }: { data: SupplierReportSupplier }">
              <p class="text-sm text-slate-600">{{ formatDate(data.last_purchase_at) }}</p>
            </template>
          </NxColumn>
          <NxColumn header="Total" field="total_cop" sortable>
            <template #body="{ data }: { data: SupplierReportSupplier }">
              <p class="text-right text-sm font-semibold text-slate-900">{{ formatCop(data.total_cop) }}</p>
            </template>
          </NxColumn>
        </NxDataTable>
      </section>
    </div>

    <section class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div class="px-4 pt-4">
        <h3 class="text-sm font-semibold text-slate-700">Detalle de lo comprado</h3>
      </div>
      <NxDataTable
        :value="report?.data ?? []"
        :loading="reportQuery.isPending.value"
        paginator
        lazy
        :rows="report?.meta.per_page ?? 40"
        :total-records="report?.meta.total ?? 0"
        :first="((report?.meta.current_page ?? 1) - 1) * (report?.meta.per_page ?? 40)"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin compras en este período.</p>
        </template>
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: SupplierReportLine }">
            <p class="text-sm text-slate-600">{{ formatDate(data.date) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Proveedor">
          <template #body="{ data }: { data: SupplierReportLine }">
            <p class="text-sm text-slate-700">{{ data.supplier_name ?? 'Sin proveedor' }}</p>
            <p v-if="data.invoice_number" class="text-xs text-slate-400">Factura {{ data.invoice_number }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Producto">
          <template #body="{ data }: { data: SupplierReportLine }">
            <p class="text-sm font-medium text-slate-900">{{ data.item_name }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Cantidad">
          <template #body="{ data }: { data: SupplierReportLine }">
            <p class="text-sm text-slate-700">{{ formatQty(data.quantity) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Costo unitario">
          <template #body="{ data }: { data: SupplierReportLine }">
            <p class="text-sm text-slate-700">{{ formatCop(data.unit_cost_cop) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Total">
          <template #body="{ data }: { data: SupplierReportLine }">
            <p class="text-right text-sm font-semibold text-slate-900">{{ formatCop(data.line_total_cop) }}</p>
          </template>
        </NxColumn>
      </NxDataTable>
    </section>
  </div>
</template>
