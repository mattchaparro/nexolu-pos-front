<script setup lang="ts">
// Movimientos de inventario: entradas/salidas/ajustes/ventas de producto o
// insumo, puerto de Admin/Reports/Inventory.vue del legacy. Las opciones de
// razon/producto/insumo para los filtros vienen del mismo payload que usa la
// pestana de Margenes (reasons/product_options/ingredient_options) - un solo
// fetch para toda la pantalla, ver InventoryReportsView.vue.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { NamedOption, ReasonOption, StockMovementRow } from '@/types/inventoryReport'
import { NxButton, NxColumn, NxDataTable, NxDatePicker, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useStockMovementsReport } from '../composables/useStockMovementsReport'
import { fetchStockMovementsCsv } from '../services/inventoryReportService'

const props = defineProps<{
  reasons: ReasonOption[]
  productOptions: NamedOption[]
  ingredientOptions: NamedOption[]
}>()

const typeLabels: Record<string, { label: string; icon: string; class: string }> = {
  entry: { label: 'Entrada', icon: 'pi pi-arrow-down', class: 'text-emerald-600' },
  exit: { label: 'Salida', icon: 'pi pi-arrow-up', class: 'text-red-500' },
  adjustment: { label: 'Ajuste', icon: 'pi pi-sliders-h', class: 'text-slate-500' },
  sale: { label: 'Venta', icon: 'pi pi-shopping-cart', class: 'text-indigo-500' },
}

const dateFrom = ref('')
const dateTo = ref(toLocalDateIso())
const type = ref('')
const reasonId = ref<number | null>(null)
const productId = ref<number | null>(null)
const ingredientId = ref<number | null>(null)
const page = ref(1)

watch([dateFrom, dateTo, type, reasonId, productId, ingredientId], () => {
  page.value = 1
})

const filters = computed(() => ({
  from: dateFrom.value || undefined,
  to: dateTo.value || undefined,
  type: type.value || undefined,
  reason_id: reasonId.value ?? undefined,
  product_id: productId.value ?? undefined,
  ingredient_id: ingredientId.value ?? undefined,
}))

const movementsQuery = useStockMovementsReport(page, filters)
const meta = computed(() => movementsQuery.data.value?.meta)

const typeOptions = [
  { id: '', label: 'Todos los tipos' },
  { id: 'entry', label: 'Entrada' },
  { id: 'exit', label: 'Salida' },
  { id: 'adjustment', label: 'Ajuste' },
  { id: 'sale', label: 'Venta' },
]

const reasonOptions = computed(() => [{ id: null, label: 'Toda razón' }, ...props.reasons.map((r) => ({ id: r.id, label: r.label }))])
const productSelectOptions = computed(() => [{ id: null, label: 'Todo producto' }, ...props.productOptions.map((p) => ({ id: p.id, label: p.name }))])
const ingredientSelectOptions = computed(() => [
  { id: null, label: 'Todo insumo' },
  ...props.ingredientOptions.map((i) => ({ id: i.id, label: i.name })),
])

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const { notify } = useSystemAlert()
const exporting = ref(false)

async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchStockMovementsCsv(filters.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `movimientos-inventario-${toLocalDateIso()}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos exportar los movimientos.'), 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 items-end gap-3 lg:flex lg:flex-wrap">
      <NxDatePicker v-model="dateFrom" label="Desde" class="w-full lg:w-40" />
      <NxDatePicker v-model="dateTo" label="Hasta" class="w-full lg:w-40" />
      <NxSelect v-model="type" :options="typeOptions" option-label="label" option-value="id" label="Tipo" class="w-full lg:w-40" />
      <NxSelect v-model="reasonId" :options="reasonOptions" option-label="label" option-value="id" label="Razón" class="w-full lg:w-44" />
      <NxSelect v-model="productId" :options="productSelectOptions" option-label="label" option-value="id" label="Producto" class="w-full lg:w-48" />
      <NxSelect
        v-model="ingredientId"
        :options="ingredientSelectOptions"
        option-label="label"
        option-value="id"
        label="Insumo"
        class="w-full lg:w-48"
      />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" class="col-span-2 justify-self-end lg:ml-auto" @click="exportCsv">
        Exportar CSV
      </NxButton>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="movementsQuery.data.value?.data ?? []"
        :loading="movementsQuery.isPending.value"
        paginator
        lazy
        :rows="40"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 40"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Sin movimientos con los filtros actuales.</p>
        </template>
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: StockMovementRow }">
            <p class="text-sm text-slate-700">{{ data.created_at }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Tipo">
          <template #body="{ data }: { data: StockMovementRow }">
            <span class="inline-flex items-center gap-1 text-sm font-medium" :class="typeLabels[data.type]?.class">
              <i :class="typeLabels[data.type]?.icon" />
              {{ typeLabels[data.type]?.label ?? data.type }}
            </span>
          </template>
        </NxColumn>
        <NxColumn header="Razón">
          <template #body="{ data }: { data: StockMovementRow }">
            <p class="text-sm text-slate-600">{{ data.reason_label ?? '—' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Producto / Insumo">
          <template #body="{ data }: { data: StockMovementRow }">
            <p class="text-sm text-slate-900">{{ data.product_name ?? data.ingredient_name ?? 'Eliminado' }}</p>
            <p v-if="data.product_category" class="text-xs text-slate-400">{{ data.product_category }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Cantidad">
          <template #body="{ data }: { data: StockMovementRow }">
            <p class="text-right text-sm font-semibold text-slate-900">{{ data.quantity }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Usuario">
          <template #body="{ data }: { data: StockMovementRow }">
            <p class="text-sm text-slate-600">{{ data.user_name ?? '—' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Notas">
          <template #body="{ data }: { data: StockMovementRow }">
            <p class="max-w-xs truncate text-sm text-slate-500">{{ data.notes ?? '—' }}</p>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
