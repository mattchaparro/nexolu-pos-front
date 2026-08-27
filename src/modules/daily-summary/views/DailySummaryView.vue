<script setup lang="ts">
// Resumen del dia: ingreso del negocio agrupado por canal (ventas,
// servicios, apartados, fiados cobrados) x medio de pago - una matriz que
// no existia en ningun reporte del legacy (solo tenia un desglose plano por
// medio de pago que ya mezclaba los canales, ver SalesReportService::dailySummary()).
// El filtro de medio de pago reduce la matriz a una sola columna sin volver
// a pedir datos al backend: la respuesta ya trae el desglose completo.
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import ReceiptActionsModal from '@/components/ReceiptActionsModal.vue'
import { usePermissions } from '@/composables/usePermissions'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useLayawayMutations } from '@/modules/layaways/composables/useLayawayMutations'
import { useServiceOrderMutations } from '@/modules/service-orders/composables/useServiceOrderMutations'
import { useSaleMutations } from '@/modules/sales/composables/useSaleMutations'
import type { IncomeChannel, RecentLayaway, RecentReceivable, RecentSale, RecentServiceOrder } from '@/types/dailySummary'
import { NxButton, NxDatePicker, NxSelect, NxStatCard, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import TransactionRowItem from '../components/TransactionRowItem.vue'
import { useDailySummary } from '../composables/useDailySummary'
import type { TransactionRow } from '../types'

const dateFrom = ref(toLocalDateIso())
const dateTo = ref(toLocalDateIso())
const paymentMethodFilter = ref('all')
const viewMode = ref('0')

const summaryQuery = useDailySummary(dateFrom, dateTo)

const { hasPermission } = usePermissions()
const canViewSalesHistory = computed(() => hasPermission('reports.sales'))
const canReverseSales = computed(() => hasPermission('sales.reverse'))
const canCancelServiceOrders = computed(() => hasPermission('appointments.manage'))
const canCancelLayaways = computed(() => hasPermission('layaways.manage'))

const { notify } = useSystemAlert()
const queryClient = useQueryClient()
const { reverseMutation: reverseSaleMutation } = useSaleMutations()
const { cancelMutation: cancelServiceOrderMutation } = useServiceOrderMutations()
const { cancelMutation: cancelLayawayMutation } = useLayawayMutations()

const reversingKey = ref<string | null>(null)

async function onReverse(row: TransactionRow): Promise<void> {
  if (!row.reverse) {
    return
  }
  if (!window.confirm(row.reverse.confirmText)) {
    return
  }
  reversingKey.value = row.key
  try {
    if (row.channelKey === 'sales') {
      await reverseSaleMutation.mutateAsync(row.reverse.entityId)
    } else if (row.channelKey === 'services') {
      await cancelServiceOrderMutation.mutateAsync(row.reverse.entityId)
    } else if (row.channelKey === 'layaways') {
      await cancelLayawayMutation.mutateAsync(row.reverse.entityId)
    }
    queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
    notify('Listo, se aplicó la reversión')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos completar la reversión.'), 'error')
  } finally {
    reversingKey.value = null
  }
}

watch(summaryQuery.data, (summary) => {
  const stillValid = summary?.payment_breakdown.some((m) => m.id === paymentMethodFilter.value)
  if (!stillValid) {
    paymentMethodFilter.value = 'all'
  }
})

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

// Detalle linea por linea por canal - lo que ya existia en el resumen del
// dia del legacy (3 bloques: ultimas ventas, servicios, apartados) mas
// fiados cobrados (el legacy no lo desglosaba aparte). Cada fila muestra su
// medio de pago (o el reparto completo si fue un pago dividido/varios
// medios) y un boton de comprobante, reusando el mismo ReceiptActionsModal
// que ya usan Vender/Ordenes de servicio/Apartados - un solo modal
// compartido con el estado de la fila seleccionada, igual que hacia el
// legacy con su modal unico al final de la pagina.
const paymentMethodLabelMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const method of summaryQuery.data.value?.payment_breakdown ?? []) {
    map[method.id] = method.label
  }
  return map
})

function paymentMethodLabel(id: string): string {
  return paymentMethodLabelMap.value[id] ?? id
}

const closedSales = computed<RecentSale[]>(() => (summaryQuery.data.value?.recent_sales ?? []).filter((sale) => sale.status === 'closed'))

// Filas de transaccion mapeadas a una forma comun (ver types.ts) para poder
// reusar la misma TransactionRowItem tanto agrupadas por canal (4 secciones,
// cada una ya dice su canal en el titulo) como en una sola lista con
// columna de canal - el usuario pidio poder alternar entre las dos formas
// de ver lo mismo, no solo la agrupada.
function saleRow(sale: RecentSale): TransactionRow {
  const paymentBadges =
    sale.payment_splits.length > 0
      ? sale.payment_splits.map((split) => ({ label: paymentMethodLabel(split.payment_method), amount: split.amount }))
      : sale.payment_method
        ? [{ label: paymentMethodLabel(sale.payment_method) }]
        : []

  const flags: TransactionRow['flags'] = []
  if (sale.is_non_revenue) {
    flags.push({ label: 'Cortesía', badgeClass: 'bg-fuchsia-50 text-fuchsia-600' })
  }
  if (sale.is_credit) {
    flags.push({ label: 'Fiado', badgeClass: 'bg-amber-50 text-amber-600' })
  }

  return {
    key: `sale-${sale.id}`,
    channelKey: 'sales',
    channelLabel: 'Ventas',
    title: sale.customer_name || sale.table_name || `Venta #${sale.id}`,
    subtitle: `${sale.created_at} · ${sale.items_preview}`,
    amount: sale.total,
    paymentBadges,
    flags,
    items: sale.items,
    receipt: { type: 'sale', id: sale.id, title: `Comprobante · Venta #${sale.invoice_number ?? sale.id}`, phone: sale.customer_phone },
    reverse: canReverseSales.value
      ? { entityId: sale.id, label: 'Reversar', confirmText: 'Se restaurará el stock y la venta se eliminará permanentemente. ¿Continuar?' }
      : null,
  }
}

function serviceRow(order: RecentServiceOrder): TransactionRow {
  return {
    key: `service-${order.id}`,
    channelKey: 'services',
    channelLabel: 'Servicios',
    title: order.service_name,
    subtitle: `${order.client_name || 'Sin cliente'} · saldo ${formatCop(order.balance)}`,
    amount: order.amount_paid_today,
    paymentBadges: order.payment_methods_today.map((method) => ({ label: paymentMethodLabel(method) })),
    flags: [],
    items: null,
    receipt: { type: 'service-order', id: order.id, title: `Comprobante · ${order.service_name}` },
    reverse:
      canCancelServiceOrders.value && order.status !== 'cancelled'
        ? { entityId: order.id, label: 'Cancelar', confirmText: '¿Cancelar esta orden de servicio?' }
        : null,
  }
}

function layawayRow(layaway: RecentLayaway): TransactionRow {
  return {
    key: `layaway-${layaway.id}`,
    channelKey: 'layaways',
    channelLabel: 'Apartados',
    title: layaway.customer_name || `Apartado #${layaway.id}`,
    subtitle: layaway.customer_phone || 'Sin teléfono',
    amount: layaway.amount_paid_today,
    paymentBadges: layaway.payment_methods_today.map((method) => ({ label: paymentMethodLabel(method) })),
    flags: [],
    items: null,
    receipt: { type: 'layaway', id: layaway.id, title: `Comprobante · Apartado #${layaway.id}`, phone: layaway.customer_phone },
    reverse:
      canCancelLayaways.value && layaway.status !== 'cancelled'
        ? { entityId: layaway.id, label: 'Cancelar', confirmText: '¿Cancelar este apartado? Se liberará el stock reservado y se reembolsarán los abonos.' }
        : null,
  }
}

function receivableRow(receivable: RecentReceivable): TransactionRow {
  return {
    key: `receivable-${receivable.id}`,
    channelKey: 'receivables',
    channelLabel: 'Fiados',
    title: receivable.customer_name || `Fiado #${receivable.id}`,
    subtitle: `${receivable.paid_at} · ${receivable.customer_phone || 'Sin teléfono'}`,
    amount: receivable.amount,
    paymentBadges: receivable.payment_method ? [{ label: paymentMethodLabel(receivable.payment_method) }] : [],
    flags: [],
    items: null,
    // Sin recibo: no existe endpoint de comprobante para fiados en el backend.
    receipt: null,
    reverse: null,
  }
}

const salesRows = computed(() => closedSales.value.map(saleRow))
const serviceRows = computed(() =>
  summaryQuery.data.value?.channels_enabled.services ? (summaryQuery.data.value.recent_service_orders ?? []).map(serviceRow) : [],
)
const layawayRows = computed(() =>
  summaryQuery.data.value?.channels_enabled.layaways ? (summaryQuery.data.value.recent_layaways ?? []).map(layawayRow) : [],
)
const receivableRows = computed(() =>
  summaryQuery.data.value?.channels_enabled.receivables ? (summaryQuery.data.value.recent_receivables ?? []).map(receivableRow) : [],
)

const allRows = computed<TransactionRow[]>(() => [...salesRows.value, ...serviceRows.value, ...layawayRows.value, ...receivableRows.value])

const linesGrouped = ref(true)

const receiptModalOpen = ref(false)
const receiptEntity = ref<TransactionRow['receipt']>(null)

function openReceipt(row: TransactionRow): void {
  if (!row.receipt) {
    return
  }
  receiptEntity.value = row.receipt
  receiptModalOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <i class="pi pi-chart-bar text-lg text-indigo-600" />
      <h1 class="text-lg font-bold text-slate-900">Resumen del día</h1>
    </div>

    <div class="grid grid-cols-2 items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex lg:flex-wrap">
      <NxDatePicker v-model="dateFrom" label="Desde" class="w-full lg:w-40" />
      <NxDatePicker v-model="dateTo" label="Hasta" class="w-full lg:w-40" />
      <NxButton variant="outline" class="w-full lg:w-auto" @click="setToday">Hoy</NxButton>
      <NxButton variant="outline" class="w-full lg:w-auto" @click="setLast7Days">Últimos 7 días</NxButton>
      <NxSelect
        v-model="paymentMethodFilter"
        :options="paymentMethodOptions"
        option-label="label"
        option-value="id"
        label="Medio de pago"
        class="col-span-2 lg:w-56"
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

      <!-- ================= Detalle de transacciones ================= -->
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-slate-700">Detalle de transacciones</h2>
        <NxToggleButton v-model="linesGrouped" label="Agrupar por canal" icon="pi pi-sitemap" />
      </div>

      <template v-if="linesGrouped">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-700">Ventas <span class="font-normal text-slate-400">({{ salesRows.length }})</span></h3>
            <RouterLink v-if="canViewSalesHistory" :to="{ name: 'sales-history.index', query: { from: dateFrom, to: dateTo } }">
              <NxButton size="sm" variant="outline" icon="pi pi-external-link">Ver historial de ventas</NxButton>
            </RouterLink>
          </div>
          <p v-if="salesRows.length === 0" class="py-4 text-center text-sm text-slate-400">Sin ventas cerradas en este rango.</p>
          <div v-else class="flex flex-col divide-y divide-slate-100">
            <TransactionRowItem
              v-for="row in salesRows"
              :key="row.key"
              :row="row"
              :show-channel="false"
              :reversing="reversingKey === row.key"
              @receipt="openReceipt(row)"
              @reverse="onReverse(row)"
            />
          </div>
        </div>

        <div v-if="summaryQuery.data.value.channels_enabled.services" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-1 text-sm font-semibold text-slate-700">Servicios <span class="font-normal text-slate-400">({{ serviceRows.length }})</span></h3>
          <p v-if="serviceRows.length === 0" class="py-4 text-center text-sm text-slate-400">Sin abonos a servicios en este rango.</p>
          <div v-else class="flex flex-col divide-y divide-slate-100">
            <TransactionRowItem
              v-for="row in serviceRows"
              :key="row.key"
              :row="row"
              :show-channel="false"
              :reversing="reversingKey === row.key"
              @receipt="openReceipt(row)"
              @reverse="onReverse(row)"
            />
          </div>
        </div>

        <div v-if="summaryQuery.data.value.channels_enabled.layaways" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-1 text-sm font-semibold text-slate-700">Apartados <span class="font-normal text-slate-400">({{ layawayRows.length }})</span></h3>
          <p v-if="layawayRows.length === 0" class="py-4 text-center text-sm text-slate-400">Sin abonos a apartados en este rango.</p>
          <div v-else class="flex flex-col divide-y divide-slate-100">
            <TransactionRowItem
              v-for="row in layawayRows"
              :key="row.key"
              :row="row"
              :show-channel="false"
              :reversing="reversingKey === row.key"
              @receipt="openReceipt(row)"
              @reverse="onReverse(row)"
            />
          </div>
        </div>

        <div v-if="summaryQuery.data.value.channels_enabled.receivables" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-1 text-sm font-semibold text-slate-700">
            Fiados cobrados <span class="font-normal text-slate-400">({{ receivableRows.length }})</span>
          </h3>
          <p v-if="receivableRows.length === 0" class="py-4 text-center text-sm text-slate-400">Sin fiados cobrados en este rango.</p>
          <div v-else class="flex flex-col divide-y divide-slate-100">
            <TransactionRowItem v-for="row in receivableRows" :key="row.key" :row="row" :show-channel="false" @receipt="openReceipt(row)" />
          </div>
        </div>
      </template>

      <div v-else class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p v-if="allRows.length === 0" class="py-4 text-center text-sm text-slate-400">Sin transacciones en este rango.</p>
        <div v-else class="flex flex-col divide-y divide-slate-100">
          <TransactionRowItem
            v-for="row in allRows"
            :key="row.key"
            :row="row"
            :show-channel="true"
            :reversing="reversingKey === row.key"
            @receipt="openReceipt(row)"
            @reverse="onReverse(row)"
          />
        </div>
      </div>
    </template>

    <ReceiptActionsModal
      v-if="receiptEntity"
      v-model="receiptModalOpen"
      :entity-type="receiptEntity.type"
      :entity-id="receiptEntity.id"
      :document-title="receiptEntity.title"
      :default-phone="receiptEntity.phone"
    />
  </div>
</template>
