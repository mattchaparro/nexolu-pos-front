<script setup lang="ts">
// Agenda - calendario de citas con 3 vistas: Dia, Semana, Mes. Semana y Dia
// comparten TimeGridCalendar (posicion por hora exacta); Mes usa
// MonthCalendar (grilla de dias con chips, sin espacio para posicionar por
// hora). Puerto de Admin/Appointments/Index.vue del legacy en Dia/Semana -
// legacy no tiene vista de Mes, se agregó a pedido explícito.
import { computed, ref } from 'vue'

import { useStaffOptions } from '@/composables/useStaffOptions'
import type { Appointment } from '@/types/appointment'
import { NxButton, NxPageHeader, NxSelect } from '@/ui'

import AppointmentDetailModal from '../components/AppointmentDetailModal.vue'
import AppointmentFormModal from '../components/AppointmentFormModal.vue'
import MonthCalendar from '../components/MonthCalendar.vue'
import TimeGridCalendar from '../components/TimeGridCalendar.vue'
import { useAppointments } from '../composables/useAppointments'
import { addDays, startOfWeek, toDateInputValue } from '../support/appointmentTime'

type ViewMode = 'day' | 'week' | 'month'

const viewMode = ref<ViewMode>('week')
const anchorDate = ref(new Date())

const staffQuery = useStaffOptions()
const staffFilter = ref<number | ''>('')

// Rango visible + celdas a dibujar, uno por modo. Mes dibuja tambien los
// dias de relleno del mes anterior/siguiente que completan la grilla (igual
// que MonthCalendar) - from/to cubre exactamente eso, no solo el mes
// calendario, para que esas celdas tambien muestren sus citas reales.
const weekStart = computed(() => startOfWeek(anchorDate.value))
const monthGridStart = computed(() => {
  const firstOfMonth = new Date(anchorDate.value.getFullYear(), anchorDate.value.getMonth(), 1)
  return startOfWeek(firstOfMonth)
})
const monthGridEnd = computed(() => {
  const lastOfMonth = new Date(anchorDate.value.getFullYear(), anchorDate.value.getMonth() + 1, 0)
  return addDays(startOfWeek(lastOfMonth), 6)
})

const visibleDays = computed(() => {
  if (viewMode.value === 'day') {
    return [anchorDate.value]
  }
  if (viewMode.value === 'week') {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i))
  }
  return []
})

const from = computed(() => {
  if (viewMode.value === 'month') {
    return toDateInputValue(monthGridStart.value)
  }
  return toDateInputValue(visibleDays.value[0] ?? anchorDate.value)
})
const to = computed(() => {
  if (viewMode.value === 'month') {
    return toDateInputValue(monthGridEnd.value)
  }
  return toDateInputValue(visibleDays.value[visibleDays.value.length - 1] ?? anchorDate.value)
})
// La vista de mes puede tener bastantes mas de 50 citas en el rango - el
// resto de vistas se queda con el default (ver useAppointments).
const perPage = computed(() => (viewMode.value === 'month' ? 200 : 50))

const appointmentsQuery = useAppointments(from, to, perPage)
const appointments = computed(() => {
  const all = appointmentsQuery.data.value?.data ?? []
  return staffFilter.value === '' ? all : all.filter((a) => a.user_id === staffFilter.value)
})

const rangeLabel = computed(() => {
  if (viewMode.value === 'day') {
    const fmt = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: '2-digit', month: 'short' })
    return fmt.format(anchorDate.value)
  }
  if (viewMode.value === 'week') {
    const fmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
    return `${fmt.format(weekStart.value)} – ${fmt.format(addDays(weekStart.value, 6))}`
  }
  const fmt = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
  return fmt.format(anchorDate.value)
})

function goToday(): void {
  anchorDate.value = new Date()
}
function goPrev(): void {
  if (viewMode.value === 'day') {
    anchorDate.value = addDays(anchorDate.value, -1)
  } else if (viewMode.value === 'week') {
    anchorDate.value = addDays(weekStart.value, -7)
  } else {
    anchorDate.value = new Date(anchorDate.value.getFullYear(), anchorDate.value.getMonth() - 1, 1)
  }
}
function goNext(): void {
  if (viewMode.value === 'day') {
    anchorDate.value = addDays(anchorDate.value, 1)
  } else if (viewMode.value === 'week') {
    anchorDate.value = addDays(weekStart.value, 7)
  } else {
    anchorDate.value = new Date(anchorDate.value.getFullYear(), anchorDate.value.getMonth() + 1, 1)
  }
}

function goToDay(date: Date): void {
  anchorDate.value = date
  viewMode.value = 'day'
}

const createModalOpen = ref(false)
const createPresetStart = ref<Date | null>(null)
const detailModalOpen = ref(false)
const selectedAppointment = ref<Appointment | null>(null)

function openCreate(): void {
  createPresetStart.value = viewMode.value === 'day' ? anchorDate.value : null
  createModalOpen.value = true
}

function onSlotClick(date: Date): void {
  createPresetStart.value = date
  createModalOpen.value = true
}

function onAppointmentClick(appointment: Appointment): void {
  selectedAppointment.value = appointment
  detailModalOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Agenda" icon="pi pi-calendar" compact />
      <NxButton icon="pi pi-plus" @click="openCreate">Nueva cita</NxButton>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-1">
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="goPrev">
          <i class="pi pi-chevron-left" />
        </button>
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100" @click="goToday">
          Hoy
        </button>
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="goNext">
          <i class="pi pi-chevron-right" />
        </button>
      </div>
      <p class="text-sm font-semibold capitalize text-slate-700">{{ rangeLabel }}</p>

      <div class="flex rounded-lg border border-slate-200 p-0.5 text-sm font-medium">
        <button
          type="button"
          class="rounded-md px-3 py-1 transition-colors"
          :class="viewMode === 'day' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
          @click="viewMode = 'day'"
        >
          Día
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1 transition-colors"
          :class="viewMode === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
          @click="viewMode = 'week'"
        >
          Semana
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1 transition-colors"
          :class="viewMode === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
          @click="viewMode = 'month'"
        >
          Mes
        </button>
      </div>

      <NxSelect
        :model-value="staffFilter"
        :options="[{ id: '', name: 'Todo el personal' }, ...(staffQuery.data.value ?? [])]"
        option-label="name"
        option-value="id"
        label="Personal"
        class="min-w-[200px]"
        @update:model-value="staffFilter = $event as number | ''"
      />
    </div>

    <MonthCalendar
      v-if="viewMode === 'month'"
      :month-anchor="anchorDate"
      :appointments="appointments"
      :loading="appointmentsQuery.isPending.value"
      @day-click="goToDay"
      @appointment-click="onAppointmentClick"
    />
    <TimeGridCalendar
      v-else
      :days="visibleDays"
      :appointments="appointments"
      :loading="appointmentsQuery.isPending.value"
      @slot-click="onSlotClick"
      @appointment-click="onAppointmentClick"
    />

    <AppointmentFormModal v-model="createModalOpen" :appointment="null" :preset-start="createPresetStart" />
    <AppointmentDetailModal v-model="detailModalOpen" :appointment="selectedAppointment" />
  </div>
</template>
