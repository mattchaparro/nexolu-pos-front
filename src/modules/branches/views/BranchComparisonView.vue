<script setup lang="ts">
// Comparativo entre sedes: cuál vende más, cuál gasta más, cuánto aporta
// cada una.
//
// A diferencia del resto de las pantallas, esta NO respeta la sede activa
// del selector: un comparativo que solo viera una sede no compararía nada
// (ver BranchComparisonService en la API).
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { fetchBranchComparison } from '@/services/branches'
import type { BranchComparisonRow } from '@/types/branch'
import { NxCard, NxColumn, NxDataTable, NxDatePicker, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const today = new Date()
const from = ref(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)))
const to = ref(isoDate(today))

const comparisonQuery = useQuery({
  queryKey: computed(() => ['reports', 'branches', from.value, to.value] as const),
  queryFn: () => fetchBranchComparison({ from: from.value, to: to.value }),
})

const rows = computed(() => comparisonQuery.data.value?.branches ?? [])
const totals = computed(() => comparisonQuery.data.value?.totals)

/**
 * La sede que más aporta, para destacarla sin que haya que leer la tabla.
 *
 * null cuando no hubo ingreso en el periodo: sin ventas, revenue_share_pct
 * viene null y el banner quedaba diciendo "aporta el % del ingreso".
 */
const leader = computed<BranchComparisonRow | null>(() => {
  if (rows.value.length < 2 || (totals.value?.revenue ?? 0) <= 0) {
    return null
  }
  return [...rows.value].sort((a, b) => b.revenue - a.revenue)[0] ?? null
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <NxPageHeader
      title="Comparativo de sedes"
      subtitle="Ingreso, gastos y aporte de cada sede al negocio."
      icon="pi pi-chart-bar"
    />

    <NxCard>
      <div class="flex flex-wrap items-end gap-4">
        <NxDatePicker v-model="from" label="Desde" />
        <NxDatePicker v-model="to" label="Hasta" />
      </div>
    </NxCard>

    <NxCard v-if="leader" class="border-l-4 border-l-indigo-500">
      <p class="text-sm text-slate-600">
        <span class="font-semibold text-slate-900">{{ leader.name }}</span>
        aporta el {{ leader.revenue_share_pct }}% del ingreso del periodo.
      </p>
    </NxCard>

    <NxCard>
      <NxDataTable :value="rows" :loading="comparisonQuery.isLoading.value" data-key="branch_id">
        <NxColumn header="Sede">
          <template #body="{ data }: { data: BranchComparisonRow }">
            <div class="flex items-center gap-2">
              <span class="font-medium text-slate-800">{{ data.name }}</span>
              <span
                v-if="data.is_main"
                class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
              >
                Principal
              </span>
            </div>
          </template>
        </NxColumn>

        <NxColumn header="Ventas">
          <template #body="{ data }: { data: BranchComparisonRow }">
            <span class="text-slate-600">{{ data.sales_count }}</span>
          </template>
        </NxColumn>

        <NxColumn header="Ingreso">
          <template #body="{ data }: { data: BranchComparisonRow }">
            <span class="font-medium text-slate-800">{{ formatCop(data.revenue) }}</span>
            <!-- El aporte al total es lo que convierte una lista de cifras
                 en una comparacion. -->
            <p v-if="data.revenue_share_pct !== null" class="text-xs text-slate-400">
              {{ data.revenue_share_pct }}% del total
            </p>
          </template>
        </NxColumn>

        <NxColumn header="Ticket promedio">
          <template #body="{ data }: { data: BranchComparisonRow }">
            <span class="text-slate-600">{{ formatCop(data.avg_ticket) }}</span>
          </template>
        </NxColumn>

        <NxColumn header="Gastos">
          <template #body="{ data }: { data: BranchComparisonRow }">
            <span class="text-slate-600">{{ formatCop(data.expenses) }}</span>
          </template>
        </NxColumn>

        <NxColumn header="Neto">
          <template #body="{ data }: { data: BranchComparisonRow }">
            <span :class="data.net >= 0 ? 'text-slate-800' : 'text-red-600'" class="font-medium">
              {{ formatCop(data.net) }}
            </span>
          </template>
        </NxColumn>
      </NxDataTable>

      <div
        v-if="totals"
        class="mt-4 flex flex-wrap items-center justify-end gap-6 border-t border-slate-100 pt-4 text-sm"
      >
        <span class="text-slate-500">
          Ventas: <span class="font-medium text-slate-800">{{ totals.sales_count }}</span>
        </span>
        <span class="text-slate-500">
          Ingreso: <span class="font-medium text-slate-800">{{ formatCop(totals.revenue) }}</span>
        </span>
        <span class="text-slate-500">
          Gastos: <span class="font-medium text-slate-800">{{ formatCop(totals.expenses) }}</span>
        </span>
        <span class="text-slate-500">
          Neto: <span class="font-medium text-slate-800">{{ formatCop(totals.net) }}</span>
        </span>
      </div>
    </NxCard>
  </div>
</template>
