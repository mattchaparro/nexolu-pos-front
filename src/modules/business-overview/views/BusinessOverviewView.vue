<script setup lang="ts">
// Mi negocio: el reporte de reportes, pensado para que el dueño entienda de
// un vistazo como le va - a proposito distinto de Resumen del dia (que es el
// detalle transaccional de un dia puntual). Tres bloques: el pulso de ahora
// mismo (hoy/ayer, esta semana/semana pasada), el patron de los ultimos 30
// dias (tendencia + horas calientes/frias), y el mes elegido (rotacion de
// productos con su impacto real, descuentos entregados, fiado pendiente).
import { computed, ref } from 'vue'

import { NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import HourlyHeatmap from '../components/HourlyHeatmap.vue'
import ProfitRankedList from '../components/ProfitRankedList.vue'
import RankedBarList from '../components/RankedBarList.vue'
import StatTile from '../components/StatTile.vue'
import TrendLineChart from '../components/TrendLineChart.vue'
import { useBusinessOverview } from '../composables/useBusinessOverview'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const overviewQuery = useBusinessOverview(year, month)
const overview = computed(() => overviewQuery.data.value)

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const monthOptions = monthNames.map((label, i) => ({ label, value: i + 1 }))
const yearOptions = Array.from({ length: 6 }, (_, i) => ({ label: String(now.getFullYear() - i), value: now.getFullYear() - i }))

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="flex flex-col gap-5 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <i class="pi pi-chart-line text-lg text-indigo-600" />
      <h1 class="text-lg font-bold text-slate-900">Mi negocio</h1>
    </div>

    <div v-if="overviewQuery.isPending.value" class="h-96 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="overview">
      <!-- Pulso: siempre relativo a ahora -->
      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-semibold text-slate-700">Ahora mismo</h2>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Hoy"
            :value="formatCop(overview.pulse.today.revenue)"
            :delta="overview.pulse.today_vs_yesterday_pct"
            delta-label="vs ayer"
          />
          <StatTile label="Ventas hoy" :value="String(overview.pulse.today.sales_count)" />
          <StatTile
            label="Esta semana"
            :value="formatCop(overview.pulse.this_week.revenue)"
            :delta="overview.pulse.week_vs_last_week_pct"
            delta-label="vs semana pasada"
          />
          <StatTile label="Ticket promedio (semana)" :value="formatCop(overview.pulse.this_week.avg_ticket)" />
        </div>
      </section>

      <!-- Tendencia -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-slate-700">Tendencia de ingresos · últimos 30 días</h2>
        <TrendLineChart :days="overview.trend.days" />
      </section>

      <!-- Horas calientes/frias -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-slate-700">Horas calientes y frías · últimos 30 días</h2>
        <HourlyHeatmap :heatmap="overview.heatmap" />
      </section>

      <!-- Selector de mes -->
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 class="text-sm font-semibold text-slate-700">Reporte del mes</h2>
        <div class="flex gap-3">
          <NxSelect v-model="month" :options="monthOptions" option-label="label" option-value="value" size="sm" class="w-40" />
          <NxSelect v-model="year" :options="yearOptions" option-label="label" option-value="value" size="sm" class="w-28" />
        </div>
      </div>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Ingresos del mes"
          :value="formatCop(overview.period.summary.revenue)"
          :delta="overview.period.summary.revenue_change_pct"
          delta-label="vs mes anterior"
        />
        <StatTile label="Ticket promedio" :value="formatCop(overview.period.summary.avg_ticket)" />
        <StatTile label="Unidades vendidas" :value="formatQty(overview.period.summary.units_sold)" />
        <StatTile
          v-if="overview.channels_enabled.expenses"
          label="Neto estimado"
          :value="formatCop(overview.period.summary.net_estimate)"
        />
      </section>

      <section class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Descuentos entregados</p>
          <p class="text-xl font-semibold text-slate-900">{{ formatCop(overview.period.discounts.total) }}</p>
          <p v-if="overview.period.discounts.pct_of_revenue !== null" class="mt-1 text-xs text-slate-400">
            {{ overview.period.discounts.pct_of_revenue }}% de los ingresos del mes
          </p>
        </div>
        <div v-if="overview.period.receivables" class="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p class="text-xs font-medium text-amber-700">Fiado pendiente ahora</p>
          <p class="text-xl font-semibold text-amber-900">{{ formatCop(overview.period.receivables.outstanding_total) }}</p>
          <p class="mt-1 text-xs text-amber-700/80">
            {{ overview.period.receivables.outstanding_count }} cuenta(s) por cobrar ·
            {{ formatCop(overview.period.receivables.collected_this_period) }} cobrados este mes
          </p>
        </div>
      </section>

      <!-- Margen de ganancia: aparte de descuentos/fiado porque expone
           rentabilidad real, solo visible con el permiso accounting.manage -->
      <section v-if="overview.period.profit" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-emerald-900">Margen de ganancia del mes</h3>
          <span class="text-xl font-bold text-emerald-900">
            {{ overview.period.profit.margin_pct !== null ? `${overview.period.profit.margin_pct}%` : '—' }}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p class="text-emerald-700/70">Ingresos con costo</p>
            <p class="font-semibold text-emerald-900">{{ formatCop(overview.period.profit.revenue) }}</p>
          </div>
          <div>
            <p class="text-emerald-700/70">Costo</p>
            <p class="font-semibold text-emerald-900">{{ formatCop(overview.period.profit.cost) }}</p>
          </div>
          <div>
            <p class="text-emerald-700/70">Utilidad</p>
            <p class="font-semibold text-emerald-900">{{ formatCop(overview.period.profit.profit) }}</p>
          </div>
        </div>
        <p class="mt-3 text-xs text-emerald-700/70">
          Solo cuenta productos con costo configurado en Catálogo.
          <template v-if="overview.period.profit.uncosted_products_count > 0">
            {{ overview.period.profit.uncosted_products_count }} producto(s) sin costo quedaron fuera
            ({{ formatCop(overview.period.profit.uncosted_revenue) }} en ingresos no considerados).
          </template>
        </p>
      </section>

      <section v-if="overview.period.profit" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="mb-1 text-sm font-semibold text-slate-700">Top 10 por utilidad</h3>
        <p class="mb-3 text-xs text-slate-400">Solo productos con costo configurado - la ganancia real, no solo lo más vendido.</p>
        <ProfitRankedList :items="overview.period.profit.top_products" />
      </section>

      <!-- Rotacion con impacto -->
      <section class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-1 text-sm font-semibold text-slate-700">Mayor rotación</h3>
          <p class="mb-3 text-xs text-slate-400">Por unidades vendidas este mes, con su participación en el ingreso.</p>
          <RankedBarList :items="overview.period.top_products" />
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-1 text-sm font-semibold text-slate-700">Menor rotación</h3>
          <p class="mb-3 text-xs text-slate-400">Entre los que sí tuvieron al menos una venta este mes.</p>
          <RankedBarList :items="overview.period.bottom_products" />
        </div>
      </section>

      <section v-if="overview.period.top_services" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="mb-3 text-sm font-semibold text-slate-700">Servicios más solicitados</h3>
        <div v-if="overview.period.top_services.length === 0" class="py-4 text-center text-xs text-slate-400">
          Sin órdenes de servicio este mes.
        </div>
        <div v-else class="flex flex-col divide-y divide-slate-100">
          <div v-for="s in overview.period.top_services" :key="s.name" class="flex items-center justify-between py-2 text-sm">
            <span class="font-medium text-slate-800">{{ s.name }}</span>
            <span class="text-slate-400">{{ s.orders_count }} orden(es)</span>
            <span class="font-semibold text-slate-900">{{ formatCop(s.collected) }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
