<script setup lang="ts">
// Vista de mes - grilla de semanas x 7 dias, cada celda con hasta 3 citas
// como chips (+"N más" si hay mas) - a diferencia de Dia/Semana (que
// posicionan por hora exacta), aca no hay espacio para eso, es un vistazo
// de "cuantas/cuales citas hay este dia". Click en un dia cambia a la
// vista Dia (mismo patron que un calendario estandar); click en un chip
// abre el detalle de esa cita directo, sin cambiar de vista. No tiene
// equivalente en el legacy (que solo llega a Dia/Semana) - vista nueva
// pedida explicitamente.
import { computed } from 'vue'

import type { Appointment } from '@/types/appointment'

import { addDays, startOfWeek } from '../support/appointmentTime'

const props = defineProps<{
  monthAnchor: Date
  appointments: Appointment[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'day-click': [date: Date]
  'appointment-click': [appointment: Appointment]
}>()

const MAX_VISIBLE_PER_DAY = 3

const weeks = computed(() => {
  const firstOfMonth = new Date(props.monthAnchor.getFullYear(), props.monthAnchor.getMonth(), 1)
  const lastOfMonth = new Date(props.monthAnchor.getFullYear(), props.monthAnchor.getMonth() + 1, 0)
  const gridStart = startOfWeek(firstOfMonth)
  const gridEnd = startOfWeek(lastOfMonth)

  const result: Date[][] = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    result.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)))
    cursor = addDays(cursor, 7)
  }
  return result
})

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isCurrentMonth(day: Date): boolean {
  return day.getMonth() === props.monthAnchor.getMonth()
}

function isToday(day: Date): boolean {
  return isSameDay(day, new Date())
}

function appointmentsForDay(day: Date): Appointment[] {
  return props.appointments
    .filter((a) => isSameDay(new Date(a.starts_at), day))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

function statusDotClass(appointment: Appointment): string {
  if (appointment.status === 'cancelled') {
    return 'bg-slate-300'
  }
  if (appointment.status === 'completed') {
    return 'bg-emerald-500'
  }
  if (appointment.status === 'confirmed') {
    return 'bg-indigo-500'
  }
  return 'bg-sky-500'
}

function timeLabel(appointment: Appointment): string {
  return new Date(appointment.starts_at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div class="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
      <i class="pi pi-spin pi-spinner text-xl text-slate-400" />
    </div>
    <div class="min-w-[720px]">
      <div class="grid grid-cols-7 border-b border-slate-200">
        <div v-for="name in dayNames" :key="name" class="py-2 text-center text-xs font-semibold text-slate-600">{{ name }}</div>
      </div>
      <div v-for="(week, wi) in weeks" :key="wi" class="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
        <div
          v-for="day in week"
          :key="day.toISOString()"
          class="flex min-h-[100px] cursor-pointer flex-col gap-1 border-l border-slate-100 p-1.5 text-left first:border-l-0 hover:bg-slate-50"
          :class="isCurrentMonth(day) ? '' : 'bg-slate-50/60 text-slate-300'"
          @click="emit('day-click', day)"
        >
          <span
            class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
            :class="isToday(day) ? 'bg-indigo-600 text-white' : isCurrentMonth(day) ? 'text-slate-700' : 'text-slate-300'"
          >
            {{ day.getDate() }}
          </span>
          <div class="flex flex-col gap-0.5">
            <button
              v-for="appt in appointmentsForDay(day).slice(0, MAX_VISIBLE_PER_DAY)"
              :key="appt.id"
              type="button"
              class="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] hover:bg-slate-100"
              @click.stop="emit('appointment-click', appt)"
            >
              <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="statusDotClass(appt)" />
              <span class="truncate">{{ timeLabel(appt) }} {{ appt.client_name }}</span>
            </button>
            <p v-if="appointmentsForDay(day).length > MAX_VISIBLE_PER_DAY" class="px-1 text-[10px] font-medium text-slate-400">
              +{{ appointmentsForDay(day).length - MAX_VISIBLE_PER_DAY }} más
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
