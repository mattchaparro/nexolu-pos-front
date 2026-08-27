<script setup lang="ts">
// Margenes por producto: precio - costo, y opcionalmente la ganancia REAL de
// ventas de un mes (no solo el potencial sobre el stock actual). Puerto de
// Admin/Reports/InventoryMargins.vue del legacy.
import { computed, ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { MarginRow, NamedOption } from '@/types/inventoryReport'
import { NxButton, NxColumn, NxDataTable, NxDatePicker, NxSelect, NxToggleButton } from '@/ui'
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
const withSales = ref(false)
const month = ref(currentMonthIso())

const filters = computed(() => ({
  category_id: categoryId.value ?? undefined,
  with_sales: withSales.value || undefined,
  month: withSales.value ? month.value : undefined,
}))

const marginsQuery = useMarginsReport(filters)

const categoryOptions = computed(() => [{ id: null, label: 'Toda categoría' }, ...props.categories.map((c) => ({ id: c.id, label: c.name }))])

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
      <NxSelect v-model="categoryId" :options="categoryOptions" option-label="label" option-value="id" label="Categoría" class="col-span-2 lg:w-48" />
      <NxToggleButton v-model="withSales" label="Con ventas del mes" icon="pi pi-chart-line" class="col-span-2 justify-self-start lg:w-auto" />
      <NxDatePicker v-if="withSales" v-model="month" view="month" date-format="mm/yy" label="Mes" class="col-span-2 lg:w-40" />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" class="col-span-2 justify-self-end lg:ml-auto" @click="exportCsv">
        Exportar CSV
      </NxButton>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable :value="marginsQuery.data.value?.margin_rows ?? []" :loading="marginsQuery.isPending.value">
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin productos con costo configurado.</p>
        </template>
        <NxColumn header="Producto">
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm font-medium text-slate-900">{{ data.name }}</p>
            <p v-if="data.category" class="text-xs text-slate-400">{{ data.category }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Stock">
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ data.stock }}<span v-if="data.is_recipe" class="ml-1 text-xs text-slate-400">(lotes)</span></p>
          </template>
        </NxColumn>
        <NxColumn header="Precio">
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ formatCop(data.price) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Costo">
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ formatCop(data.cost_price) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Margen">
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm font-semibold text-slate-900">{{ formatCop(data.margin_cop) }} <span class="font-normal text-slate-400">({{ marginPctLabel(data) }})</span></p>
          </template>
        </NxColumn>
        <NxColumn header="Ganancia potencial (stock)">
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ formatCop(data.profit_total) }}</p>
          </template>
        </NxColumn>
        <NxColumn v-if="withSales" header="Vendidos">
          <template #body="{ data }: { data: MarginRow }">
            <p class="text-sm text-slate-700">{{ data.qty_sold ?? 0 }}</p>
          </template>
        </NxColumn>
        <NxColumn v-if="withSales" header="Ganancia real (ventas)">
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
