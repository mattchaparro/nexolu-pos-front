<script setup lang="ts">
// Ventas por vendedor: puerto de Admin/Reports/SalesBySeller.vue del legacy
// (admin.reports.sales-by-seller). "Vendedor" = quien cerro la venta
// (closed_by_user_id), no quien la abrio - ver SalesReportService::salesBySeller().
import { computed, ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SellerSummary } from '@/types/salesBySeller'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxStatCard } from '@/ui'
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

    <div class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <NxInput v-model="dateFrom" type="date" label="Desde" size="sm" class="w-40" />
      <NxInput v-model="dateTo" type="date" label="Hasta" size="sm" class="w-40" />
      <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="setToday">
        Hoy
      </button>
      <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="setLast7Days">
        Últimos 7 días
      </button>
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" class="ml-auto" @click="exportCsv">Exportar CSV</NxButton>
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
        <NxColumn header="Vendedor">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm font-medium text-slate-900">{{ data.user_name }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Ventas">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-700">{{ data.sales_count }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Unidades vendidas">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-700">{{ data.items_sold }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Ticket promedio">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-700">{{ formatCop(data.avg_ticket) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Por medio de pago">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="max-w-sm truncate text-xs text-slate-500">{{ methodsSummary(data) || '—' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Última venta">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-sm text-slate-600">{{ data.last_sale_at ?? '—' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Total bruto">
          <template #body="{ data }: { data: SellerSummary }">
            <p class="text-right text-sm font-semibold text-slate-900">{{ formatCop(data.gross_total) }}</p>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
