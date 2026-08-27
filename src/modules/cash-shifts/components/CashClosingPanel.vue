<script setup lang="ts">
// Cierre de caja: si el dueño acumulo dias sin cerrar, la cola (arriba) lo
// guia a cerrarlos en orden empezando por el mas antiguo - cerrar ese dia
// saca su fecha de la cola automaticamente (la lista se recalcula) y salta
// sola al siguiente. La base del dia siguiente se sugiere igual a lo
// contado hoy (lo que normalmente se deja en caja) para que el dueño no
// tenga que pensarlo, pero puede cambiarla.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxDatePicker, NxInputNumber } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useCashClosingPreview, usePendingClosingDates } from '../composables/useCashClosing'
import { useCashClosingMutations } from '../composables/useCashClosingMutations'
import { useCashDifference } from '../composables/useCashDifference'
import DailySummaryDetailModal from './DailySummaryDetailModal.vue'
import PaymentBreakdownList from './PaymentBreakdownList.vue'
import PendingDatesQueue from './PendingDatesQueue.vue'

const pendingDatesQuery = usePendingClosingDates()

const selectedDate = ref(toLocalDateIso())
const hasInitialized = ref(false)

watch(
  pendingDatesQuery.data,
  (dates) => {
    if (!dates) {
      return
    }
    if (dates.length > 0 && (!hasInitialized.value || !dates.includes(selectedDate.value))) {
      selectedDate.value = dates[0]
    }
    hasInitialized.value = true
  },
  { immediate: true },
)

const openingCash = ref(0)
const openingCashInitializedForDate = ref<string | null>(null)
const actualCash = ref<number | null>(null)
const baseForNextDay = ref<number | null>(null)
const baseTouched = ref(false)
const formError = ref<string | null>(null)

watch(selectedDate, () => {
  actualCash.value = null
  baseForNextDay.value = null
  baseTouched.value = false
  formError.value = null
})

watch(actualCash, (value) => {
  if (!baseTouched.value) {
    baseForNextDay.value = value
  }
})

function onBaseForNextDayInput(value: number | null): void {
  baseTouched.value = true
  baseForNextDay.value = value
}

const previewQuery = useCashClosingPreview(selectedDate, openingCash)

watch(previewQuery.data, (preview) => {
  if (!preview) {
    return
  }
  if (openingCashInitializedForDate.value !== preview.date) {
    openingCash.value = preview.suggested_opening_cash
    openingCashInitializedForDate.value = preview.date
  }
})

const existingClosing = computed(() => previewQuery.data.value?.existing_closing ?? null)
const shiftsToAutoClose = computed(() => previewQuery.data.value?.shifts_to_auto_close ?? [])
const expectedCash = computed(() => previewQuery.data.value?.totals.expected_cash ?? 0)
const { tone: differenceTone, message: differenceMessage } = useCashDifference(actualCash, expectedCash)

const { notify } = useSystemAlert()
const { storeMutation } = useCashClosingMutations()

const detailModalOpen = ref(false)

async function submit(): Promise<void> {
  if (actualCash.value === null || baseForNextDay.value === null) {
    return
  }
  formError.value = null
  try {
    await storeMutation.mutateAsync({
      date: selectedDate.value,
      opening_cash: openingCash.value,
      actual_cash: actualCash.value,
      base_for_next_day: baseForNextDay.value,
    })
    notify('Cierre de caja registrado')
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos registrar el cierre de caja.')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <PendingDatesQueue
      v-if="pendingDatesQuery.data.value && pendingDatesQuery.data.value.length > 0"
      :dates="pendingDatesQuery.data.value"
      :selected="selectedDate"
      @select="selectedDate = $event"
    />

    <div class="flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <NxDatePicker v-model="selectedDate" label="Fecha a cerrar" :max-date="toLocalDateIso()" class="w-40" />
    </div>

    <div v-if="previewQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <div v-else-if="existingClosing" class="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <i class="pi pi-check-circle text-2xl text-emerald-500" />
      <p class="mt-2 text-sm font-medium text-slate-700">Ya existe un cierre de caja para el {{ selectedDate }}.</p>
      <p class="text-xs text-slate-400">Consúltalo en el historial más abajo.</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        @click="detailModalOpen = true"
      >
        Ver detalle del día
      </button>
    </div>

    <template v-else-if="previewQuery.data.value">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Base inicial</p>
          <p class="text-lg font-bold text-slate-900">{{ formatCop(previewQuery.data.value.totals.opening_cash) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Ventas totales</p>
          <p class="text-lg font-bold text-slate-900">{{ formatCop(previewQuery.data.value.totals.total_sales) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Gastos</p>
          <p class="text-lg font-bold text-slate-900">{{ formatCop(previewQuery.data.value.totals.total_expenses) }}</p>
        </div>
        <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <p class="text-xs font-medium text-indigo-600">Efectivo esperado</p>
          <p class="text-lg font-bold text-indigo-900">{{ formatCop(expectedCash) }}</p>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-slate-700">Ingresos por medio de pago</h3>
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            @click="detailModalOpen = true"
          >
            <i class="pi pi-eye text-xs" />
            Ver detalle
          </button>
        </div>
        <PaymentBreakdownList :breakdown="previewQuery.data.value.totals.payment_breakdown" />
      </div>

      <div v-if="shiftsToAutoClose.length > 0" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="mb-2 text-sm font-semibold text-slate-700">Turnos que se cerrarán automáticamente</h3>
        <p class="mb-3 text-xs text-slate-400">
          Estos empleados dejaron su turno abierto - al confirmar este cierre, sus turnos se cierran con el efectivo que les correspondía.
        </p>
        <ul class="flex flex-col gap-1">
          <li v-for="shift in shiftsToAutoClose" :key="shift.id" class="flex items-center justify-between text-sm">
            <span class="text-slate-700">{{ shift.user?.full_name ?? 'Empleado' }}</span>
            <span class="text-slate-400">desde {{ new Date(shift.opened_at).toLocaleString('es-CO') }}</span>
          </li>
        </ul>
      </div>

      <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-700">Arqueo</h3>

        <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

        <NxInputNumber v-model="actualCash" label="Efectivo real contado" required />

        <p
          v-if="differenceMessage"
          class="rounded-lg px-3 py-2 text-xs"
          :class="{
            'bg-emerald-50 text-emerald-700': differenceTone === 'ok',
            'bg-amber-50 text-amber-700': differenceTone === 'over',
            'bg-red-50 text-red-700': differenceTone === 'short',
          }"
        >
          {{ differenceMessage }}
        </p>

        <NxInputNumber :model-value="baseForNextDay" label="Base para el día siguiente" required @update:model-value="onBaseForNextDayInput" />

        <NxButton :disabled="actualCash === null || baseForNextDay === null" :loading="storeMutation.isPending.value" @click="submit">
          Confirmar cierre de caja
        </NxButton>
      </div>
    </template>

    <DailySummaryDetailModal v-model="detailModalOpen" :date="selectedDate" />
  </div>
</template>
