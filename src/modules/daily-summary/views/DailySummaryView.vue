<script setup lang="ts">
// Resumen del dia: ingreso del negocio agrupado por canal (ventas,
// servicios, apartados, fiados cobrados) x medio de pago - una matriz que
// no existia en ningun reporte del legacy (solo tenia un desglose plano por
// medio de pago que ya mezclaba los canales, ver SalesReportService::dailySummary()).
// El filtro de medio de pago reduce la matriz a una sola columna sin volver
// a pedir datos al backend: la respuesta ya trae el desglose completo.
import { computed, ref, watch } from 'vue'

import type { IncomeChannel } from '@/types/dailySummary'
import { NxInput, NxSelect, NxStatCard, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useDailySummary } from '../composables/useDailySummary'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const dateFrom = ref(todayIso())
const dateTo = ref(todayIso())
const paymentMethodFilter = ref('all')
const viewMode = ref('0')

const summaryQuery = useDailySummary(dateFrom, dateTo)

watch(summaryQuery.data, (summary) => {
  const stillValid = summary?.payment_breakdown.some((m) => m.id === paymentMethodFilter.value)
  if (!stillValid) {
    paymentMethodFilter.value = 'all'
  }
})

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

const paymentMethodOptions = computed(() => [
  { id: 'all', label: 'Todos los medios' },
  ...(summaryQuery.data.value?.payment_breakdown ?? []).map((m) => ({ id: m.id, label: m.label })),
])

const visibleChannels = computed<IncomeChannel[]>(() => {
  const summary = summaryQuery.data.value
  if (!summary) {
    return []
  }
  return summary.channels.filter((channel) => channel.key === 'sales' || summary.channels_enabled[channel.key])
})

const visibleColumns = computed(() => {
  const columns = summaryQuery.data.value?.payment_breakdown ?? []
  if (paymentMethodFilter.value === 'all') {
    return columns
  }
  return columns.filter((m) => m.id === paymentMethodFilter.value)
})

function channelAmount(channel: IncomeChannel, methodId: string): number {
  return channel.by_payment_method.find((m) => m.id === methodId)?.total ?? 0
}

function channelTotal(channel: IncomeChannel): number {
  if (paymentMethodFilter.value === 'all') {
    return channel.total
  }
  return channelAmount(channel, paymentMethodFilter.value)
}

function columnTotal(methodId: string): number {
  return visibleChannels.value.reduce((sum, channel) => sum + channelAmount(channel, methodId), 0)
}

const grandTotal = computed(() => visibleChannels.value.reduce((sum, channel) => sum + channelTotal(channel), 0))

const filteredPaymentBreakdown = computed(() => {
  const list = summaryQuery.data.value?.payment_breakdown ?? []
  if (paymentMethodFilter.value === 'all') {
    return list
  }
  return list.filter((m) => m.id === paymentMethodFilter.value)
})
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <i class="pi pi-chart-bar text-lg text-indigo-600" />
      <h1 class="text-lg font-bold text-slate-900">Resumen del día</h1>
    </div>

    <div class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <NxInput v-model="dateFrom" type="date" label="Desde" size="sm" class="w-40" />
      <NxInput v-model="dateTo" type="date" label="Hasta" size="sm" class="w-40" />
      <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="setToday">
        Hoy
      </button>
      <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="setLast7Days">
        Últimos 7 días
      </button>
      <NxSelect
        v-model="paymentMethodFilter"
        :options="paymentMethodOptions"
        option-label="label"
        option-value="id"
        label="Medio de pago"
        size="sm"
        class="w-56"
      />
    </div>

    <div v-if="summaryQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="summaryQuery.data.value">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NxStatCard label="Ingresos totales" :value="formatCop(summaryQuery.data.value.total_sales)" icon="pi pi-dollar" />
        <NxStatCard label="Gastos" :value="formatCop(summaryQuery.data.value.total_expenses)" icon="pi pi-money-bill" />
        <NxStatCard label="Neto" :value="formatCop(summaryQuery.data.value.net)" icon="pi pi-wallet" />
        <NxStatCard label="Cortesías" :value="formatCop(summaryQuery.data.value.courtesy_total)" icon="pi pi-gift" />
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <NxTabs v-model:value="viewMode">
          <NxTabList>
            <NxTab value="0">Por canal</NxTab>
            <NxTab value="1">Todo junto</NxTab>
          </NxTabList>

          <NxTabPanels>
            <NxTabPanel value="0">
              <div class="mt-3 overflow-x-auto">
                <table class="w-full min-w-max text-sm">
                  <thead>
                    <tr class="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                      <th class="py-2 pr-4">Canal</th>
                      <th v-for="col in visibleColumns" :key="col.id" class="py-2 pr-4 text-right">{{ col.label }}</th>
                      <th class="py-2 pr-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="channel in visibleChannels" :key="channel.key" class="border-b border-slate-100">
                      <td class="py-2 pr-4 font-medium text-slate-700">
                        {{ channel.label }}
                        <span class="ml-1 text-xs font-normal text-slate-400">({{ channel.count }})</span>
                      </td>
                      <td v-for="col in visibleColumns" :key="col.id" class="py-2 pr-4 text-right text-slate-600">
                        {{ formatCop(channelAmount(channel, col.id)) }}
                      </td>
                      <td class="py-2 pr-4 text-right font-semibold text-slate-900">{{ formatCop(channelTotal(channel)) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="border-t-2 border-slate-200 font-semibold text-slate-900">
                      <td class="py-2 pr-4">Total</td>
                      <td v-for="col in visibleColumns" :key="col.id" class="py-2 pr-4 text-right">{{ formatCop(columnTotal(col.id)) }}</td>
                      <td class="py-2 pr-4 text-right">{{ formatCop(grandTotal) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </NxTabPanel>

            <NxTabPanel value="1">
              <div class="mt-3 flex flex-col gap-2">
                <div
                  v-for="method in filteredPaymentBreakdown"
                  :key="method.id"
                  class="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5"
                >
                  <span class="text-sm font-medium text-slate-700">{{ method.label }}</span>
                  <span class="text-sm font-semibold text-slate-900">{{ formatCop(method.total) }}</span>
                </div>
                <p v-if="filteredPaymentBreakdown.length === 0" class="py-4 text-center text-sm text-slate-400">Sin datos para este rango.</p>
              </div>
            </NxTabPanel>
          </NxTabPanels>
        </NxTabs>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="mb-3 text-sm font-semibold text-slate-700">Productos más vendidos</h2>
          <div v-if="summaryQuery.data.value.top_products.length === 0" class="py-4 text-center text-sm text-slate-400">Sin ventas en este rango.</div>
          <ul v-else class="flex flex-col gap-2">
            <li v-for="product in summaryQuery.data.value.top_products" :key="product.product_id" class="flex items-center justify-between text-sm">
              <span class="text-slate-700">{{ product.name }} <span class="text-slate-400">x{{ product.total_quantity }}</span></span>
              <span class="font-medium text-slate-900">{{ formatCop(product.total_revenue) }}</span>
            </li>
          </ul>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 class="mb-3 text-sm font-semibold text-slate-700">Ventas recientes</h2>
          <div v-if="summaryQuery.data.value.recent_sales.length === 0" class="py-4 text-center text-sm text-slate-400">Sin ventas en este rango.</div>
          <ul v-else class="flex flex-col gap-2">
            <li v-for="sale in summaryQuery.data.value.recent_sales" :key="sale.id" class="flex items-center justify-between text-sm">
              <span class="min-w-0 truncate text-slate-700">
                {{ sale.customer_name || sale.table_name || `Venta #${sale.id}` }}
                <span class="text-slate-400">· {{ sale.created_at }}</span>
              </span>
              <span class="ml-2 flex-shrink-0 font-medium text-slate-900">{{ formatCop(sale.total) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>
