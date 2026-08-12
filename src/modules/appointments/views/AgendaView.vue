<script setup lang="ts">
// Agenda - calendario semanal de citas. Puerto de
// Admin/Appointments/Index.vue del legacy (sin el modo de vista de un solo
// dia para mobile, ver comentario en WeekCalendar.vue).
import { computed, ref } from 'vue'

import { useStaffOptions } from '@/composables/useStaffOptions'
import type { Appointment } from '@/types/appointment'
import { NxButton, NxPageHeader, NxSelect } from '@/ui'

import AppointmentDetailModal from '../components/AppointmentDetailModal.vue'
import AppointmentFormModal from '../components/AppointmentFormModal.vue'
import WeekCalendar from '../components/WeekCalendar.vue'
import { useAppointments } from '../composables/useAppointments'
import { addDays, startOfWeek, toDateInputValue } from '../support/appointmentTime'

const staffQuery = useStaffOptions()
const staffFilter = ref<number | ''>('')

const anchorDate = ref(new Date())
const weekStart = computed(() => startOfWeek(anchorDate.value))
const weekEnd = computed(() => addDays(weekStart.value, 6))
const from = computed(() => toDateInputValue(weekStart.value))
const to = computed(() => toDateInputValue(weekEnd.value))

const appointmentsQuery = useAppointments(from, to)
const appointments = computed(() => {
  const all = appointmentsQuery.data.value?.data ?? []
  return staffFilter.value === '' ? all : all.filter((a) => a.user_id === staffFilter.value)
})

const weekLabel = computed(() => {
  const fmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
  return `${fmt.format(weekStart.value)} – ${fmt.format(weekEnd.value)}`
})

function goToday(): void {
  anchorDate.value = new Date()
}
function goPrevWeek(): void {
  anchorDate.value = addDays(weekStart.value, -7)
}
function goNextWeek(): void {
  anchorDate.value = addDays(weekStart.value, 7)
}

const createModalOpen = ref(false)
const createPresetStart = ref<Date | null>(null)
const detailModalOpen = ref(false)
const selectedAppointment = ref<Appointment | null>(null)

function openCreate(): void {
  createPresetStart.value = null
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
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="goPrevWeek">
          <i class="pi pi-chevron-left" />
        </button>
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100" @click="goToday">
          Hoy
        </button>
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="goNextWeek">
          <i class="pi pi-chevron-right" />
        </button>
      </div>
      <p class="text-sm font-semibold text-slate-700">{{ weekLabel }}</p>
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

    <WeekCalendar
      :week-start="weekStart"
      :appointments="appointments"
      :loading="appointmentsQuery.isPending.value"
      @slot-click="onSlotClick"
      @appointment-click="onAppointmentClick"
    />

    <AppointmentFormModal v-model="createModalOpen" :appointment="null" :preset-start="createPresetStart" />
    <AppointmentDetailModal v-model="detailModalOpen" :appointment="selectedAppointment" />
  </div>
</template>
