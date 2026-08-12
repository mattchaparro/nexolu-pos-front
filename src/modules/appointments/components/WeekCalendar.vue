<script setup lang="ts">
// Grilla semanal de la Agenda - columnas por dia (lun-dom) x horas (07:00-21:00),
// citas posicionadas por hora de inicio/duracion. Puerto simplificado del
// calendario CSS-grid de Admin/Appointments/Index.vue del legacy (alli
// tambien soporta una vista de un solo dia para mobile - aca se resuelve
// con scroll horizontal en vez de un modo separado, alcance acotado para
// esta primera version).
import { computed } from 'vue'

import type { Appointment } from '@/types/appointment'

import {
  AGENDA_CELL_HEIGHT_PX,
  AGENDA_END_HOUR,
  AGENDA_START_HOUR,
  addDays,
  heightPx,
  topOffsetPx,
} from '../support/appointmentTime'

const props = defineProps<{
  weekStart: Date
  appointments: Appointment[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'slot-click': [date: Date]
  'appointment-click': [appointment: Appointment]
}>()

const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(props.weekStart, i)))
const hours = computed(() => Array.from({ length: AGENDA_END_HOUR - AGENDA_START_HOUR }, (_, i) => AGENDA_START_HOUR + i))
const totalHeight = (AGENDA_END_HOUR - AGENDA_START_HOUR) * AGENDA_CELL_HEIGHT_PX

const dayFormatter = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: '2-digit' })

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function appointmentsForDay(day: Date): Appointment[] {
  return props.appointments.filter((a) => isSameDay(new Date(a.starts_at), day))
}

function statusColorClass(appointment: Appointment): string {
  if (appointment.status === 'cancelled') {
    return 'bg-slate-100 text-slate-400 line-through'
  }
  if (appointment.status === 'completed') {
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  }
  if (appointment.status === 'confirmed') {
    return 'bg-indigo-100 text-indigo-800 border border-indigo-200'
  }
  return 'bg-sky-100 text-sky-800 border border-sky-200'
}

function onColumnClick(day: Date, event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const offsetY = event.clientY - rect.top
  const minutesFromStart = Math.round(((offsetY / AGENDA_CELL_HEIGHT_PX) * 60) / 30) * 30
  const slotDate = new Date(day)
  slotDate.setHours(AGENDA_START_HOUR, 0, 0, 0)
  slotDate.setMinutes(minutesFromStart)
  emit('slot-click', slotDate)
}
</script>

<template>
  <div class="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
      <i class="pi pi-spin pi-spinner text-xl text-slate-400" />
    </div>
    <div class="min-w-[880px]">
      <div class="grid border-b border-slate-200" style="grid-template-columns: 56px repeat(7, 1fr)">
        <div />
        <div v-for="day in days" :key="day.toISOString()" class="border-l border-slate-100 py-2 text-center text-xs font-semibold text-slate-600">
          {{ dayFormatter.format(day) }}
        </div>
      </div>
      <div class="grid" style="grid-template-columns: 56px repeat(7, 1fr)">
        <div class="relative">
          <div
            v-for="hour in hours"
            :key="hour"
            :style="{ height: `${AGENDA_CELL_HEIGHT_PX}px` }"
            class="pr-2 text-right text-[11px] text-slate-400"
          >
            {{ hour }}:00
          </div>
        </div>
        <div
          v-for="day in days"
          :key="day.toISOString()"
          class="relative cursor-pointer border-l border-slate-100"
          :style="{ height: `${totalHeight}px` }"
          @click="onColumnClick(day, $event)"
        >
          <div
            v-for="hour in hours"
            :key="hour"
            class="border-t border-slate-100"
            :style="{ height: `${AGENDA_CELL_HEIGHT_PX}px` }"
          />
          <button
            v-for="appt in appointmentsForDay(day)"
            :key="appt.id"
            type="button"
            class="absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm"
            :class="statusColorClass(appt)"
            :style="{ top: `${topOffsetPx(new Date(appt.starts_at))}px`, height: `${heightPx(new Date(appt.starts_at), new Date(appt.ends_at))}px` }"
            @click.stop="emit('appointment-click', appt)"
          >
            <p class="truncate font-semibold">{{ appt.client_name }}</p>
            <p class="truncate">{{ appt.service?.name ?? '' }}</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
