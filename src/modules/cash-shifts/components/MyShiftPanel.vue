<script setup lang="ts">
// "Mi turno": lo que ve cualquier empleado con permiso cash_shift.manage -
// abrir turno si no tiene uno, o su estado en vivo (ventas de hoy, gastos,
// efectivo esperado) con boton de cierre si ya tiene uno abierto. Vender
// exige un turno abierto (ver EnsureCashShiftOpenForSales en el backend), asi
// que esta pantalla es el paso obligatorio antes de poder cobrar.
import { computed, ref } from 'vue'

import { NxStatCard } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useCurrentShift } from '../composables/useCurrentShift'
import CloseShiftModal from './CloseShiftModal.vue'
import OpenShiftForm from './OpenShiftForm.vue'
import PaymentBreakdownList from './PaymentBreakdownList.vue'
import StaleShiftBanner from './StaleShiftBanner.vue'

const currentShiftQuery = useCurrentShift()
const closeModalOpen = ref(false)

const shift = computed(() => currentShiftQuery.data.value?.shift ?? null)
const totals = computed(() => currentShiftQuery.data.value?.preview_totals ?? null)
</script>

<template>
  <div v-if="currentShiftQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

  <OpenShiftForm v-else-if="!shift" />

  <div v-else class="flex flex-col gap-4">
    <StaleShiftBanner v-if="shift.is_from_a_previous_day" :shift="shift" />

    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p class="text-xs font-medium text-slate-500">Turno abierto desde</p>
        <p class="text-sm font-semibold text-slate-900">{{ new Date(shift.opened_at).toLocaleString('es-CO') }}</p>
      </div>
      <button
        type="button"
        class="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500"
        @click="closeModalOpen = true"
      >
        Cerrar mi turno
      </button>
    </div>

    <div v-if="totals" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NxStatCard label="Base inicial" :value="formatCop(totals.opening_cash)" icon="pi pi-wallet" />
      <NxStatCard label="Ventas en efectivo" :value="formatCop(totals.total_cash)" icon="pi pi-dollar" />
      <NxStatCard label="Gastos" :value="formatCop(totals.total_expenses)" icon="pi pi-money-bill" />
      <NxStatCard label="Efectivo esperado ahora" :value="formatCop(totals.expected_cash)" icon="pi pi-calculator" />
    </div>

    <div v-if="totals" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-sm font-semibold text-slate-700">Ingresos por medio de pago</h3>
      <PaymentBreakdownList :breakdown="totals.payment_breakdown" />
    </div>

    <CloseShiftModal v-model="closeModalOpen" :shift="shift" :expected-cash="totals?.expected_cash ?? 0" />
  </div>
</template>
