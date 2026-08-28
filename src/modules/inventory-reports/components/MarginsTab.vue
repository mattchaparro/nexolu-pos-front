<script setup lang="ts">
// Margenes por producto: precio - costo, y opcionalmente la ganancia REAL de
// ventas de un mes (no solo el potencial sobre el stock actual). Puerto de
// Admin/Reports/InventoryMargins.vue del legacy.
import { computed, ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { MarginRow, NamedOption } from '@/types/inventoryReport'
import { NxButton, NxColumn, NxDataTable, NxDatePicker, NxInput, NxSelect, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useMarginsReport } from '../composables/useMarginsReport'
import { fetchMarginsCsv } from '../services/inventoryReportService'

const props = defineProps<{ categories: NamedOption[] }>()

function currentMonthIso(): string {
  return toLocalDateIso().slice(0, 7)
}

const categoryId = ref<number | null>(null)
// Arranca activo a pedido explicito: la ganancia real de ventas es el dato
// que mas importa de este reporte, no el potencial sobre stock nada mas.
const withSales = ref(true)
const month = ref(currentMonthIso())
const searchInput = ref('')

const filters = computed(() => ({
  category_id: categoryId.value ?? undefined,
  with_sales: withSales.value || undefined,
  month: withSales.value ? month.value : undefined,
}))

const marginsQuery = useMarginsReport(filters)

const categoryOptions = computed(() => [{ id: null, label: 'Toda categoría' }, ...props.categories.map((c) => ({ id: c.id, label: c.name }))])

// Buscador por nombre - client-side porque el endpoint ya trae todos los
// productos con costo de una sola vez (sin paginar, ver InventoryReportService::margins()
// en nexolu-pos-api), no hace falta ida y vuelta al servidor para filtrar.
const filteredRows = computed(() => {
  const rows = marginsQuery.data.value?.margin_rows ?? []
  const query = searchInput.value.trim().toLowerCase()
  if (!query) {
    return rows
  }
  return rows.filter((row) => row.name.toLowerCase().includes(query))
})

const { notify } = useSystemAlert()
const exporting = ref(false)

async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchMarginsCsv(filters.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `margenes-${toLocalDateIso()}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos exportar los márgenes.'), 'error')
  } finally {
    exporting.value = false
  }
}

function marginPctLabel(row: MarginRow): string {
  return row.margin_pct !== null ? `${row.margin_pct}%` : '—'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 items-end gap-3 lg:flex lg:flex-wrap">
      <NxSelect v-model="categoryId" :options="categoryOptions" option-label="label" option-value="id" label="Categoría" filter class="col-span-2 lg:w-48" />
      <NxToggleButton v-model="withSales" label="Con ventas del mes" icon="pi pi-chart-line" class="col-span-2 justify-self-start lg:w-auto" />
      <NxDatePicker v-if="withSales" v-model="month" view="month" date-format="mm/yy" label="Mes" class="col-span-2 lg:w-40" />
      <NxInput v-model="searchInput" label="Buscar producto" icon="pi pi-search" clearable class="col-span-2 lg:min-w-[220px] lg:flex-1" />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" class="col-span-2 justify-self-end lg:ml-auto" @click="exportCsv">
        Exportar CSV
      </NxButton>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable :value="filteredRows" :loading="marginsQuery.isPending.value">
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin productos con costo configurado.</p>
        </template>
        <NxColumn header="Producto" field="name" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm font-medium text-slate-900">{{ data.name }}</p>
            <p v-if="data.category" class="text-xs text-slate-400">{{ data.category }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Stock" field="stock" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ data.stock }}<span v-if="data.is_recipe" class="ml-1 text-xs text-slate-400">(lotes)</span></p>
          </template>
        </NxColumn>
        <NxColumn header="Precio" field="price" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ formatCop(data.price) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Costo" field="cost_price" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ formatCop(data.cost_price) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Margen" field="margin_pct" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm font-semibold text-slate-900">{{ formatCop(data.margin_cop) }} <span class="font-normal text-slate-400">({{ marginPctLabel(data) }})</span></p>
          </template>
        </NxColumn>
        <NxColumn header="Ganancia potencial (stock)" field="profit_total" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ formatCop(data.profit_total) }}</p>
          </template>
        </NxColumn>
        <NxColumn v-if="withSales" header="Vendidos" field="qty_sold" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ data.qty_sold ?? 0 }}</p>
          </template>
        </NxColumn>
        <NxColumn v-if="withSales" header="Ganancia real (ventas)" field="profit_from_sales" sortable>
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-right text-sm font-semibold text-emerald-600">{{ formatCop(data.profit_from_sales ?? 0) }}</p>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <div v-if="withSales && (marginsQuery.data.value?.uncosted_rows.length ?? 0) > 0" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 class="mb-2 text-sm font-semibold text-amber-800">Vendidos sin costo configurado</h3>
      <p class="mb-3 text-xs text-amber-700/80">
        Tuvieron ventas este mes pero no tienen costo en Catálogo, así que no se les puede calcular ganancia real.
      </p>
      <div class="flex flex-col divide-y divide-amber-100">
        <div
          v-for="row in marginsQuery.data.value?.uncosted_rows ?? []"
          :key="row.name"
          class="flex items-center justify-between py-1.5 text-sm text-amber-900"
        >
          <span>{{ row.name }} <span class="text-amber-600">x{{ row.qty_sold }}</span></span>
          <span class="font-medium">{{ formatCop(row.revenue) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
