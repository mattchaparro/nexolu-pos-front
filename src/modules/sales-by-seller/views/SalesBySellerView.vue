<script setup lang="ts">
// Ventas por vendedor: puerto de Admin/Reports/SalesBySeller.vue del legacy
// (admin.reports.sales-by-seller). "Vendedor" = quien cerro la venta
// (closed_by_user_id), no quien la abrio - ver SalesReportService::salesBySeller().
import { computed, ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SellerSummary } from '@/types/salesBySeller'
import { NxButton, NxColumn, NxDataTable, NxDatePicker, NxPageHeader, NxStatCard } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useSalesBySeller } from '../composables/useSalesBySeller'
import { fetchSalesBySellerCsv } from '../services/salesBySellerService'

const dateFrom = ref(toLocalDateIso())
const dateTo = ref(toLocalDateIso())

const sellerQuery = useSalesBySeller(dateFrom, dateTo)

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

function methodsSummary(seller: SellerSummary): string {
  return seller.methods.map((m) => `${m.label}: ${formatCop(m.total)}`).join(' · ')
}

const { notify } = useSystemAlert()
const exporting = ref(false)

async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchSalesBySellerCsv(dateFrom.value, dateTo.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ventas-por-vendedor-${dateFrom.value}-a-${dateTo.value}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos exportar las ventas por vendedor.'), 'error')
  } finally {
    exporting.value = false
  }
}

const totals = computed(() => sellerQuery.data.value?.totals)
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Ventas por vendedor" icon="pi pi-users" compact />

    <div class="grid grid-cols-2 items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex lg:flex-wrap">
      <NxDatePicker v-model="dateFrom" label="Desde" class="w-full lg:w-40" />
      <NxDatePicker v-model="dateTo" label="Hasta" class="w-full lg:w-40" />
      <NxButton variant="outline" class="w-full lg:w-auto" @click="setToday">Hoy</NxButton>
      <NxButton variant="outline" class="w-full lg:w-auto" @click="setLast7Days">Últimos 7 días</NxButton>
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" class="col-span-2 justify-self-end lg:ml-auto" @click="exportCsv">
        Exportar CSV
      </NxButton>
    </div>

    <div v-if="totals" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NxStatCard label="Ventas" :value="String(totals.sales_count)" icon="pi pi-receipt" />
      <NxStatCard label="Total bruto" :value="formatCop(totals.gross_total)" icon="pi pi-dollar" />
      <NxStatCard label="Ticket promedio" :value="formatCop(totals.avg_ticket)" icon="pi pi-wallet" />
      <NxStatCard label="Vendedores" :value="String(totals.sellers_count)" icon="pi pi-users" />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable :value="sellerQuery.data.value?.sellers ?? []" :loading="sellerQuery.isPending.value">
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin ventas cerradas en este rango.</p>
        </template>
        <NxColumn header="Vendedor" field="user_name" sortable>
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm font-medium text-slate-900">{{ data.user_name }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Ventas" field="sales_count" sortable>
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-700">{{ data.sales_count }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Unidades vendidas" field="items_sold" sortable>
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-700">{{ data.items_sold }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Ticket promedio" field="avg_ticket" sortable>
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-700">{{ formatCop(data.avg_ticket) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Por medio de pago">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="max-w-sm truncate text-xs text-slate-500">{{ methodsSummary(data) || '—' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Última venta" field="last_sale_at" sortable>
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-600">{{ data.last_sale_at ?? '—' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Total bruto" field="gross_total" sortable>
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-right text-sm font-semibold text-slate-900">{{ formatCop(data.gross_total) }}</p>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
