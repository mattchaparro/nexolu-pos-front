<script setup lang="ts">
// Planificador - calendario mes/semana + lista de pendientes filtrable por
// día + completados recientes colapsables. Puerto de
// Admin/Reminders/Index.vue del legacy (sin tabs - el legacy usa secciones
// apiladas).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Reminder } from '@/types/reminder'
import { NxButton, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useReminderMutations } from '../composables/useReminderMutations'
import { useReminders } from '../composables/useReminders'
import PostponeModal from '../components/PostponeModal.vue'
import ReminderFormModal from '../components/ReminderFormModal.vue'
import {
  addDays,
  isSameDay,
  recurrenceDescription,
  reminderOccursOnDay,
  startOfWeekMonday,
  toDateOnly,
} from '../support/reminderRecurrence'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const remindersQuery = useReminders()
const { completeMutation, deleteMutation } = useReminderMutations()
const { notify } = useSystemAlert()

const pending = computed(() => remindersQuery.data.value?.pending ?? [])
const completed = computed(() => remindersQuery.data.value?.completed ?? [])
const allReminders = computed(() => [...pending.value, ...completed.value])

// ── Calendario ──────────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week'
const viewMode = ref<ViewMode>('month')
const calendarAnchor = ref(new Date())

const calendarDays = computed((): Date[] => {
  const firstOfMonth = new Date(calendarAnchor.value.getFullYear(), calendarAnchor.value.getMonth(), 1)
  const start = startOfWeekMonday(firstOfMonth)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
})

const weekDays = computed((): Date[] => {
  const start = startOfWeekMonday(calendarAnchor.value)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

const displayedDays = computed(() => viewMode.value === 'week' ? weekDays.value : calendarDays.value)

watch(viewMode, (mode) => {
  if (mode === 'week') {
    calendarAnchor.value = new Date(calendarAnchor.value.getFullYear(), calendarAnchor.value.getMonth(), 1)
  } else {
    const start = startOfWeekMonday(calendarAnchor.value)
    calendarAnchor.value = new Date(start.getFullYear(), start.getMonth(), 1)
  }
})

function goPeriod(offset: number): void {
  if (viewMode.value === 'week') {
    calendarAnchor.value = addDays(calendarAnchor.value, offset * 7)
  } else {
    const d = new Date(calendarAnchor.value)
    d.setMonth(d.getMonth() + offset)
    calendarAnchor.value = d
  }
}

function goToday(): void {
  calendarAnchor.value = new Date()
  selectedDay.value = null
}

const periodLabel = computed(() => {
  if (viewMode.value === 'month') {
    return `${MONTH_NAMES[calendarAnchor.value.getMonth()]} ${calendarAnchor.value.getFullYear()}`
  }
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  const fmt = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase()}`
  return start.getFullYear() === end.getFullYear()
    ? `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`
    : `${fmt(start)} ${start.getFullYear()} – ${fmt(end)} ${end.getFullYear()}`
})

const isPeriodCurrent = computed(() => {
  const now = new Date()
  if (viewMode.value === 'week') {
    return weekDays.value.some((d) => isSameDay(d, now))
  }
  return calendarAnchor.value.getFullYear() === now.getFullYear() && calendarAnchor.value.getMonth() === now.getMonth()
})

function isCurrentMonth(day: Date): boolean {
  return day.getMonth() === calendarAnchor.value.getMonth()
}

function isFaded(day: Date): boolean {
  return viewMode.value === 'month' && !isCurrentMonth(day)
}

const maxPerDay = computed(() => viewMode.value === 'week' ? 6 : 2)
const cellMinHeight = computed(() => viewMode.value === 'week' ? 'min-h-[130px]' : 'min-h-[56px] sm:min-h-[64px]')

function remindersForDay(day: Date): Reminder[] {
  return allReminders.value.filter((r) => reminderOccursOnDay(r, day))
}

// ── Filtro por día ───────────────────────────────────────────────────────────
const selectedDay = ref<Date | null>(null)

function selectDay(day: Date): void {
  if (selectedDay.value && isSameDay(selectedDay.value, day)) {
    selectedDay.value = null
  } else {
    selectedDay.value = day
  }
}

const pendingFiltered = computed(() => {
  if (!selectedDay.value) {
    return pending.value
  }
  return pending.value.filter((r) => reminderOccursOnDay(r, selectedDay.value!))
})

// ── Estado de un recordatorio ────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)

function reminderStatus(reminder: Reminder): { text: string; cls: string } {
  if (!reminder.due_date) {
    return { text: 'Sin fecha', cls: 'bg-slate-100 text-slate-500' }
  }
  const hoy = toDateOnly(today)
  const fecha = toDateOnly(reminder.due_date)
  const diffDays = Math.round((fecha.getTime() - hoy.getTime()) / 86400000)
  if (diffDays < 0) {
    return { text: `Vencido hace ${Math.abs(diffDays)} día(s)`, cls: 'bg-red-100 text-red-700' }
  }
  if (diffDays === 0) {
    return { text: 'Hoy', cls: 'bg-amber-100 text-amber-700' }
  }
  if (diffDays <= 3) {
    return { text: `En ${diffDays} día(s)`, cls: 'bg-amber-50 text-amber-600' }
  }
  return { text: formatDate(reminder.due_date), cls: 'bg-slate-100 text-slate-600' }
}

// ── Origen de recordatorios del sistema ─────────────────────────────────────
function reminderOrigin(reminder: Reminder): string | null {
  if (!reminder.remindable_type) {
    return null
  }
  if (reminder.remindable_type.endsWith('Purchase')) {
    return 'Compra a crédito'
  }
  if (reminder.remindable_type.endsWith('Supplier')) {
    return 'Visita de proveedor'
  }
  if (reminder.remindable_type.endsWith('FixedExpenseTemplate')) {
    return 'Gasto fijo'
  }
  if (reminder.remindable_type.endsWith('Expense')) {
    return 'Gasto'
  }
  return null
}

// ── Formato de fecha ─────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return '—'
  }
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCompletedAt(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Acciones ─────────────────────────────────────────────────────────────────
const formModalOpen = ref(false)
const postponeModalOpen = ref(false)
const postponingReminder = ref<Reminder | null>(null)

function openPostpone(reminder: Reminder): void {
  postponingReminder.value = reminder
  postponeModalOpen.value = true
}

async function markComplete(reminder: Reminder): Promise<void> {
  try {
    await completeMutation.mutateAsync(reminder.id)
    notify('Recordatorio marcado como completado')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos completar el recordatorio.'))
  }
}

async function removeReminder(reminder: Reminder): Promise<void> {
  if (!window.confirm(`¿Eliminar recordatorio "${reminder.title}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(reminder.id)
    notify('Recordatorio eliminado')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el recordatorio.'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Planificador" icon="pi pi-calendar-clock" compact />
      <NxButton icon="pi pi-plus" @click="formModalOpen = true">Recordatorio</NxButton>
    </div>

    <!-- ── Calendario ──────────────────────────────────────────────────── -->
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <!-- Controles de navegación -->
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
            @click="goPeriod(-1)"
          >
            <i class="pi pi-chevron-left text-sm" />
          </button>
          <button
            type="button"
            :class="['rounded-xl border px-3 py-2 text-sm font-medium', isPeriodCurrent ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50']"
            @click="goToday"
          >
            Hoy
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
            @click="goPeriod(1)"
          >
            <i class="pi pi-chevron-right text-sm" />
          </button>
        </div>

        <span class="order-last w-full text-center text-sm font-semibold text-slate-700 sm:order-none sm:w-auto sm:text-left">
          {{ periodLabel }}
        </span>

        <!-- Toggle mes/semana -->
        <div class="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            :class="['px-3 py-1.5 transition-colors', viewMode === 'month' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50']"
            @click="viewMode = 'month'"
          >
            Mes
          </button>
          <button
            type="button"
            :class="['px-3 py-1.5 transition-colors', viewMode === 'week' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50']"
            @click="viewMode = 'week'"
          >
            Semana
          </button>
        </div>
      </div>

      <!-- Nombres de día -->
      <div class="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400">
        <span v-for="d in DAY_NAMES" :key="d">{{ d }}</span>
      </div>

      <!-- Celdas -->
      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="(day, i) in displayedDays"
          :key="i"
          type="button"
          class="relative rounded-lg border p-1.5 text-left transition-colors"
          :class="[
            cellMinHeight,
            isFaded(day) ? 'bg-slate-50 text-slate-300' : 'bg-white',
            selectedDay && isSameDay(selectedDay, day) ? 'border-indigo-500 ring-1 ring-indigo-400' : 'border-slate-100 hover:border-slate-300',
          ]"
          @click="selectDay(day)"
        >
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
            :class="isSameDay(day, new Date()) ? 'bg-indigo-600 text-white' : (isFaded(day) ? 'text-slate-300' : 'text-slate-600')"
          >
            {{ day.getDate() }}
          </span>

          <div class="mt-1 space-y-0.5">
            <p
              v-for="rem in remindersForDay(day).slice(0, maxPerDay)"
              :key="rem.id"
              class="truncate rounded px-1 py-0.5 text-[10px]"
              :class="rem.status === 'done' ? 'bg-emerald-50 text-emerald-600 line-through' : 'bg-indigo-50 text-indigo-700'"
            >
              {{ rem.title }}
            </p>
            <p v-if="remindersForDay(day).length > maxPerDay" class="text-[10px] text-slate-400">
              +{{ remindersForDay(day).length - maxPerDay }} más
            </p>
          </div>
        </button>
      </div>

      <p v-if="selectedDay" class="mt-3 flex items-center gap-2 text-xs text-slate-500">
        Mostrando pendientes del {{ formatDate(selectedDay.toISOString().slice(0, 10)) }}.
        <button type="button" class="font-medium text-indigo-600 hover:underline" @click="selectedDay = null">
          Ver todos
        </button>
      </p>
    </div>

    <!-- ── Pendientes ──────────────────────────────────────────────────── -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
        Pendientes ({{ pendingFiltered.length }})
      </div>

      <div v-if="remindersQuery.isPending.value" class="divide-y divide-slate-100">
        <div v-for="i in 3" :key="i" class="flex items-start gap-3 px-4 py-3">
          <div class="mt-0.5 h-5 w-5 animate-pulse rounded-full bg-slate-200" />
          <div class="flex-1 space-y-1.5">
            <div class="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div class="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div v-else-if="pendingFiltered.length === 0" class="px-4 py-8 text-center text-sm text-slate-400">
        {{ selectedDay ? 'Nada pendiente ese día.' : 'No tienes recordatorios pendientes.' }}
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="reminder in pendingFiltered"
          :key="reminder.id"
          class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start"
        >
          <div class="flex min-w-0 items-start gap-3">
            <!-- Checkbox para completar -->
            <button
              type="button"
              title="Marcar como hecho"
              class="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 transition hover:border-emerald-500 hover:bg-emerald-50"
              :disabled="completeMutation.isPending.value"
              @click="markComplete(reminder)"
            />
            <div class="min-w-0">
              <p class="break-words text-sm font-medium text-slate-800">{{ reminder.title }}</p>
              <p v-if="reminder.notes" class="break-words text-xs text-slate-500">{{ reminder.notes }}</p>
              <p v-if="reminderOrigin(reminder)" class="text-xs text-indigo-500">{{ reminderOrigin(reminder) }}</p>
              <p v-if="reminder.is_recurring" class="text-xs text-slate-400">
                {{ recurrenceDescription(reminder.recurrence, reminder.due_date) }}
              </p>
            </div>
          </div>

          <!-- Badge estado + acciones -->
          <div class="flex flex-wrap items-center gap-2 pl-8 sm:ml-auto sm:shrink-0 sm:pl-0">
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="reminderStatus(reminder).cls"
            >
              {{ reminderStatus(reminder).text }}
            </span>
            <button
              type="button"
              title="Posponer"
              class="text-slate-400 transition hover:text-amber-500"
              @click="openPostpone(reminder)"
            >
              <i class="pi pi-clock text-base" />
            </button>
            <button
              type="button"
              title="Eliminar"
              class="text-slate-400 transition hover:text-red-500"
              :disabled="deleteMutation.isPending.value"
              @click="removeReminder(reminder)"
            >
              <i class="pi pi-trash text-base" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Completados (colapsable) ────────────────────────────────────── -->
    <details v-if="completed.length > 0" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <summary class="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-700">
        Completados recientes ({{ completed.length }})
      </summary>
      <div class="divide-y divide-slate-100 border-t border-slate-100">
        <div
          v-for="reminder in completed"
          :key="reminder.id"
          class="flex items-center gap-3 px-4 py-3"
        >
          <i class="pi pi-check-circle shrink-0 text-lg text-emerald-500" />
          <p class="min-w-0 flex-1 text-sm text-slate-500 line-through">{{ reminder.title }}</p>
          <span class="shrink-0 text-xs text-slate-400">{{ formatCompletedAt(reminder.completed_at) }}</span>
        </div>
      </div>
    </details>

    <ReminderFormModal v-model="formModalOpen" />
    <PostponeModal v-model="postponeModalOpen" :reminder="postponingReminder" />
  </div>
</template>
