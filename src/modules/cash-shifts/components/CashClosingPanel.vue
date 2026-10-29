<script setup lang="ts">
// Cierre de caja: arranca siempre en hoy. Los dias sin cierre no hace falta
// cerrarlos uno por uno: la base se arrastra con lo que conto cada turno
// (ver CashShiftService::expectedOpeningCash), asi que cerrar hoy ya parte
// del efectivo acumulado. La base del dia siguiente se sugiere igual a lo
// contado, pero el dueño puede cambiarla.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxDatePicker, NxInputNumber } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import GatewayReconciliationCard from './GatewayReconciliationCard.vue'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import {
  useCashClosingHistory,
  useCashClosingPreview,
  usePendingClosingDates,
} from '../composables/useCashClosing'
import { useCashClosingMutations } from '../composables/useCashClosingMutations'
import { useCashDifference } from '../composables/useCashDifference'
import DailySummaryDetailModal from './DailySummaryDetailModal.vue'
import PaymentBreakdownList from './PaymentBreakdownList.vue'
import PendingDatesQueue from './PendingDatesQueue.vue'

const pendingDatesQuery = usePendingClosingDates()

const selectedDate = ref(toLocalDateIso())

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

// Cerrar el dia en curso tiene consecuencias que cerrar uno vencido no:
// despues del cierre nadie puede abrir turno hoy y lo que se siga vendiendo
// no entra en este cierre. Central Cell lo cerro dos veces por error
// (18 y 29 de oct) queriendo cerrar solo los dias anteriores.
const isClosingToday = computed(() => selectedDate.value === toLocalDateIso())
const pendingPastDates = computed(() =>
  (pendingDatesQuery.data.value ?? []).filter((date) => date < toLocalDateIso()),
)
const shiftsToAutoClose = computed(() => previewQuery.data.value?.shifts_to_auto_close ?? [])
// El primer turno del dia abrio con una base distinta a la que dejo el cierre
// anterior: la diferencia no es de hoy, paso entre ese cierre y la apertura.
const openingMismatch = computed(() => previewQuery.data.value?.opening_mismatch ?? null)

// El cierre anterior al dia que se esta cerrando, para decidir la base de
// manana mirando lo que se dejo ayer (pedido de Central Cell: el dato ya
// existia en cada cierre pero ninguna pantalla lo mostraba). Misma query que
// la tabla de historial (pagina 1, del mas reciente al mas viejo), asi que
// no suma una consulta.
const recentClosingsQuery = useCashClosingHistory(ref(1))
const previousClosing = computed(
  () =>
    recentClosingsQuery.data.value?.data.find(
      (closing) => closing.date.slice(0, 10) < selectedDate.value,
    ) ?? null,
)

function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
}
// Nulo si el negocio no tiene pasarela conectada: mostrarle un cuadre en
// ceros a quien solo cobra en efectivo sería ruido.
const gatewayReconciliation = computed(
  () => previewQuery.data.value?.gateway_reconciliation ?? null,
)
const expectedCash = computed(() => previewQuery.data.value?.totals.expected_cash ?? 0)
const { tone: differenceTone, message: differenceMessage } = useCashDifference(
  actualCash,
  expectedCash,
)

const { notify } = useSystemAlert()
const { storeMutation } = useCashClosingMutations()

const detailModalOpen = ref(false)

async function submit(): Promise<void> {
  if (actualCash.value === null || baseForNextDay.value === null) {
    return
  }
  formError.value = null
  if (
    isClosingToday.value &&
    !window.confirm(
      '¿Seguro que quieres cerrar la caja de HOY?\n\n' +
        'Después del cierre nadie podrá abrir turno hoy y lo que se siga vendiendo no quedará en este cierre. Si solo querías cerrar días anteriores, cancela y elige esa fecha.',
    )
  ) {
    return
  }
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
      <NxDatePicker
        v-model="selectedDate"
        label="Fecha a cerrar"
        :max-date="toLocalDateIso()"
        class="w-40"
      />
    </div>

    <div v-if="previewQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <div
      v-else-if="existingClosing"
      class="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
    >
      <i class="pi pi-check-circle text-2xl text-emerald-500" />
      <p class="mt-2 text-sm font-medium text-slate-700">
        Ya existe un cierre de caja para el {{ selectedDate }}.
      </p>
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
          <p class="text-lg font-bold text-slate-900">
            {{ formatCop(previewQuery.data.value.totals.opening_cash) }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Ventas totales</p>
          <p class="text-lg font-bold text-slate-900">
            {{ formatCop(previewQuery.data.value.totals.total_sales) }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Gastos</p>
          <p class="text-lg font-bold text-slate-900">
            {{ formatCop(previewQuery.data.value.totals.total_expenses) }}
          </p>
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

      <div
        v-if="gatewayReconciliation"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <GatewayReconciliationCard :data="gatewayReconciliation" />
      </div>

      <div
        v-if="openingMismatch"
        class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm"
      >
        <p class="font-semibold">
          {{ openingMismatch.difference < 0 ? 'Faltaron' : 'Sobraron' }}
          {{ formatCop(Math.abs(openingMismatch.difference)) }} antes de empezar el día
        </p>
        <p class="mt-1 text-amber-800">
          El turno de {{ openingMismatch.user_name }} abrió con
          <strong>{{ formatCop(openingMismatch.shift_opening_cash) }}</strong
          >, pero el cierre del {{ formatDay(openingMismatch.previous_closing_date) }} dejó
          <strong>{{ formatCop(openingMismatch.expected_opening_cash) }}</strong
          >. Esa diferencia no es del día: pasó entre ese cierre y la apertura del turno.
        </p>
      </div>

      <div
        v-if="shiftsToAutoClose.length > 0"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h3 class="mb-2 text-sm font-semibold text-slate-700">
          Turnos que se cerrarán automáticamente
        </h3>
        <p class="mb-3 text-xs text-slate-400">
          Estos empleados dejaron su turno abierto - al confirmar este cierre, sus turnos se cierran
          con el efectivo que les correspondía.
        </p>
        <ul class="flex flex-col gap-1">
          <li
            v-for="shift in shiftsToAutoClose"
            :key="shift.id"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-slate-700">{{ shift.user?.full_name ?? 'Empleado' }}</span>
            <span class="text-slate-400"
              >desde {{ new Date(shift.opened_at).toLocaleString('es-CO') }}</span
            >
          </li>
        </ul>
      </div>

      <!-- Dia pasado: se recuerda que hoy NO se cierra con esto. Es el
           momento en que se cometio el error las dos veces: ponerse al dia
           con los cierres atrasados y seguir de largo hasta hoy. -->
      <div
        v-if="!isClosingToday"
        class="flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 shadow-sm"
        role="status"
      >
        <i class="pi pi-info-circle mt-0.5 text-lg text-indigo-500" />
        <div>
          <p class="font-semibold">Vas a cerrar la caja del {{ formatDay(selectedDate) }}.</p>
          <p class="mt-1 text-indigo-800">
            Hoy, {{ formatDay(toLocalDateIso()) }}, no se cierra con esto: sigue abierto para vender
            y abrir turnos. Ciérralo solo cuando termine la jornada.
          </p>
        </div>
      </div>

      <div
        v-if="isClosingToday"
        class="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm"
        role="alert"
      >
        <i class="pi pi-exclamation-triangle mt-0.5 text-lg text-amber-500" />
        <div>
          <p class="font-semibold">Vas a cerrar la caja de hoy, {{ formatDay(selectedDate) }}.</p>
          <p class="mt-1 text-amber-800">
            Después del cierre nadie podrá abrir turno hoy, y lo que se siga vendiendo no quedará en
            este cierre. Ciérrala solo cuando termine la jornada.
          </p>
          <p v-if="pendingPastDates.length > 0" class="mt-2 text-amber-800">
            ¿Querías cerrar días anteriores? Elige la fecha:
            <button
              v-for="date in pendingPastDates"
              :key="date"
              type="button"
              class="ml-1 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              @click="selectedDate = date"
            >
              {{ formatDay(date) }}
            </button>
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-700">Arqueo</h3>

        <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {{ formError }}
        </p>

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

        <NxInputNumber
          :model-value="baseForNextDay"
          label="Base para el día siguiente"
          required
          @update:model-value="onBaseForNextDayInput"
        />
        <p v-if="previousClosing" class="-mt-2 text-xs text-slate-500">
          El cierre anterior ({{ formatDay(previousClosing.date.slice(0, 10)) }}) contó
          {{ formatCop(previousClosing.actual_cash) }} y dejó
          <strong class="text-slate-700">{{ formatCop(previousClosing.base_for_next_day) }}</strong>
          de base.
        </p>

        <NxButton
          :disabled="actualCash === null || baseForNextDay === null"
          :loading="storeMutation.isPending.value"
          @click="submit"
        >
          {{
            isClosingToday
              ? 'Cerrar la caja de hoy'
              : `Cerrar la caja del ${formatDay(selectedDate)}`
          }}
        </NxButton>
      </div>
    </template>

    <DailySummaryDetailModal
      v-model="detailModalOpen"
      :date="selectedDate"
      :cash="existingClosing ?? previewQuery.data.value?.totals ?? null"
    />
  </div>
</template>
