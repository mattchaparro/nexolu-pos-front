<script setup lang="ts">
// Finanzas de la plataforma: cuanto entra, cuanto cuesta operar y que queda.
// Consume SuperAdmin\FinanceController (nexolu-pos-api).
//
// Evolucion de SuperAdmin/Finance/Index.vue del legacy. Falta su tabla de
// "margen por negocio": PlatformFinanceService todavia no calcula el desglose
// por negocio (el legacy lo hacia en su propio servicio), asi que portarla
// seria backend nuevo, no pantalla.
import { computed, ref } from 'vue'

import { NxCard, NxPageHeader, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { usePlatformFinance } from '../composables/usePlatformFinance'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const monthOptions = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
].map((label, index) => ({ value: index + 1, label }))

// Un año adelante tambien: los pagos se registran con fecha de pago y algun
// cobro adelantado puede caer en enero del año que viene.
const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((value) => ({
  value,
  label: String(value),
}))

const financeQuery = usePlatformFinance(year, month)
const summary = computed(() => financeQuery.data.value?.summary)

const marginClass = computed(() =>
  (summary.value?.margin.cop ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600',
)

const expenseRows = computed(() => {
  const expenses = summary.value?.expenses
  if (!expenses) {
    return []
  }

  return [
    { label: 'Servidor', cop: expenses.server_cop, available: true },
    { label: 'Dominio', cop: expenses.domain_cop, available: true },
    // Estos dos se consultan en vivo a IA Core / Comms. Si el servicio no
    // respondio, el numero es 0 pero NO significa "no gastamos nada", y
    // presentarlo igual que los demas convertiria un error de red en un
    // margen inflado.
    { label: 'IA', cop: expenses.ai_cop, available: expenses.ai_cost_available },
    { label: 'Mensajería', cop: expenses.messaging_cop, available: expenses.messaging_cost_available },
  ]
})

const hasUnavailableCost = computed(() => expenseRows.value.some((row) => !row.available))

const paymentMethods = computed(() =>
  Object.entries(summary.value?.income.by_payment_method ?? {})
    .map(([method, cop]) => ({ method, cop }))
    .sort((a, b) => b.cop - a.cop),
)

function methodLabel(method: string): string {
  return method === 'sin_especificar' ? 'Sin especificar' : method.replace(/_/g, ' ')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader
      title="Finanzas"
      subtitle="Cuánto gana y cuánto cuesta operar la plataforma."
      icon="pi pi-wallet"
      compact
    />

    <div class="flex flex-wrap items-end gap-3">
      <NxSelect
        v-model="month"
        :options="monthOptions"
        option-label="label"
        option-value="value"
        label="Mes"
        class="min-w-[160px]"
      />
      <NxSelect
        v-model="year"
        :options="yearOptions"
        option-label="label"
        option-value="value"
        label="Año"
        class="w-32"
      />
    </div>

    <div v-if="financeQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="summary">
      <p
        v-if="hasUnavailableCost"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
      >
        Falta el costo real de al menos un servicio (IA o mensajería): no respondió al consultarlo.
        El gasto total y el margen de abajo están <strong>subestimados</strong>.
      </p>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Ingresos del mes</p>
          <p class="text-2xl font-bold text-slate-900">{{ formatCop(summary.income.total_cop) }}</p>
          <p class="text-xs text-slate-400">{{ summary.income.count }} pagos</p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Gastos del mes</p>
          <p class="text-2xl font-bold text-slate-900">{{ formatCop(summary.expenses.total_cop) }}</p>
          <p class="text-xs text-slate-400">TRM {{ summary.expenses.usd_to_cop_rate.toFixed(0) }}</p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Margen</p>
          <p class="text-2xl font-bold" :class="marginClass">{{ formatCop(summary.margin.cop) }}</p>
          <p class="text-xs text-slate-400">
            {{ summary.margin.percent === null ? 'sin ingresos' : `${summary.margin.percent}% del ingreso` }}
          </p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">MRR real</p>
          <p class="text-2xl font-bold text-slate-900">{{ formatCop(financeQuery.data.value?.mrr_cop ?? 0) }}</p>
          <!-- MRR es lo que DEBERIA entrar el proximo ciclo segun los planes
               activos; los ingresos de arriba son lo que efectivamente se
               cobro. La diferencia entre los dos es la mora. -->
          <p class="text-xs text-slate-400">esperado el próximo ciclo</p>
        </NxCard>
      </div>

      <NxCard v-if="summary.projection" class="border-amber-200 bg-amber-50">
        <p class="text-sm font-semibold text-amber-900">Proyección a fin de mes</p>
        <p class="mt-1 text-xs text-amber-800">
          Extrapolando lo acumulado en {{ summary.projection.days_elapsed }} de
          {{ summary.projection.days_in_month }} días.
        </p>
        <p class="mt-2 text-2xl font-bold text-amber-900">
          {{ formatCop(summary.projection.income_cop) }}
        </p>
        <p class="text-xs text-amber-700">
          de ingresos si el mes sigue al mismo ritmo
        </p>
      </NxCard>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NxCard>
          <p class="mb-3 text-sm font-semibold text-slate-900">Gastos por concepto</p>
          <dl class="space-y-2">
            <div v-for="row in expenseRows" :key="row.label" class="flex items-baseline justify-between gap-3">
              <dt class="text-sm text-slate-600">
                {{ row.label }}
                <span v-if="!row.available" class="text-xs text-amber-700">(sin dato)</span>
              </dt>
              <dd class="text-sm font-semibold" :class="row.available ? 'text-slate-900' : 'text-amber-700'">
                {{ row.available ? formatCop(row.cop) : '—' }}
              </dd>
            </div>
            <div class="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2">
              <dt class="text-sm font-semibold text-slate-700">Total</dt>
              <dd class="text-sm font-bold text-slate-900">{{ formatCop(summary.expenses.total_cop) }}</dd>
            </div>
          </dl>
        </NxCard>

        <NxCard>
          <p class="mb-3 text-sm font-semibold text-slate-900">Ingresos por medio de pago</p>
          <p v-if="paymentMethods.length === 0" class="py-4 text-center text-sm text-slate-400">
            No hay pagos registrados en este mes.
          </p>
          <dl v-else class="space-y-2">
            <div v-for="row in paymentMethods" :key="row.method" class="flex items-baseline justify-between gap-3">
              <dt class="text-sm capitalize text-slate-600">{{ methodLabel(row.method) }}</dt>
              <dd class="text-sm font-semibold text-slate-900">{{ formatCop(row.cop) }}</dd>
            </div>
          </dl>
        </NxCard>
      </div>
    </template>
  </div>
</template>
