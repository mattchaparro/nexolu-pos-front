<script setup lang="ts">
// Planificador - lista de recordatorios pendientes y completados.
// Puerto de Admin/Reminders/Index.vue del legacy; sin paginación porque el
// backend devuelve {pending: [], completed: []} (completados: últimos 20).
import { computed, ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Reminder } from '@/types/reminder'
import { NxButton, NxPageHeader, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useReminderMutations } from '../composables/useReminderMutations'
import { useReminders } from '../composables/useReminders'
import PostponeModal from '../components/PostponeModal.vue'
import ReminderFormModal from '../components/ReminderFormModal.vue'

const remindersQuery = useReminders()
const { completeMutation, deleteMutation } = useReminderMutations()
const { notify } = useSystemAlert()

const pending = computed(() => remindersQuery.data.value?.pending ?? [])
const completed = computed(() => remindersQuery.data.value?.completed ?? [])

const activeTab = ref(0)
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return '—'
  }
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCompletedAt(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const RECURRENCE_LABELS: Record<string, string> = {
  none: '',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Planificador" icon="pi pi-calendar-clock" compact />
      <NxButton icon="pi pi-plus" @click="formModalOpen = true">Recordatorio</NxButton>
    </div>

    <NxTabs v-model:active-index="activeTab">
      <NxTabList>
        <NxTab value="0">
          Pendientes
          <span
            v-if="pending.length > 0"
            class="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-semibold text-indigo-700"
          >
            {{ pending.length }}
          </span>
        </NxTab>
        <NxTab value="1">Completados</NxTab>
      </NxTabList>

      <NxTabPanels>
        <!-- ============================================================ -->
        <!-- Tab 1: Pendientes                                            -->
        <!-- ============================================================ -->
        <NxTabPanel value="0">
          <div class="flex flex-col gap-2 pt-3">
            <!-- Loading skeleton -->
            <template v-if="remindersQuery.isPending.value">
              <div
                v-for="i in 3"
                :key="i"
                class="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
              />
            </template>

            <p
              v-else-if="pending.length === 0"
              class="py-10 text-center text-sm text-slate-400"
            >
              Sin recordatorios pendientes.
            </p>

            <div
              v-for="reminder in pending"
              v-else
              :key="reminder.id"
              :class="[
                'flex items-start gap-3 rounded-xl border bg-white px-4 py-3 transition-colors',
                reminder.is_overdue ? 'border-red-200 bg-red-50' : 'border-slate-200',
              ]"
            >
              <!-- Checkbox / complete button -->
              <button
                type="button"
                class="mt-0.5 flex-shrink-0 text-slate-300 hover:text-emerald-500"
                title="Marcar como completado"
                :disabled="completeMutation.isPending.value"
                @click="markComplete(reminder)"
              >
                <i class="pi pi-circle text-lg" />
              </button>

              <!-- Content -->
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-sm font-medium text-slate-900">{{ reminder.title }}</span>

                  <!-- Vencido badge -->
                  <span
                    v-if="reminder.is_overdue"
                    class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                  >
                    Vencido
                  </span>

                  <!-- Recurrencia badge -->
                  <span
                    v-if="reminder.is_recurring && RECURRENCE_LABELS[reminder.recurrence]"
                    class="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600"
                  >
                    {{ RECURRENCE_LABELS[reminder.recurrence] }}
                  </span>
                </div>

                <p class="mt-0.5 text-xs text-slate-500">
                  {{ formatDate(reminder.due_date) }}
                  <span v-if="reminder.notify_time"> · {{ reminder.notify_time }}</span>
                </p>

                <p v-if="reminder.notes" class="mt-1 text-xs text-slate-500">{{ reminder.notes }}</p>
              </div>

              <!-- Actions -->
              <div class="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  class="text-slate-400 hover:text-amber-500"
                  title="Posponer"
                  @click="openPostpone(reminder)"
                >
                  <i class="pi pi-clock text-sm" />
                </button>
                <button
                  type="button"
                  class="text-slate-300 hover:text-red-500"
                  title="Eliminar"
                  :disabled="deleteMutation.isPending.value"
                  @click="removeReminder(reminder)"
                >
                  <i class="pi pi-trash text-sm" />
                </button>
              </div>
            </div>
          </div>
        </NxTabPanel>

        <!-- ============================================================ -->
        <!-- Tab 2: Completados (últimos 20)                              -->
        <!-- ============================================================ -->
        <NxTabPanel value="1">
          <div class="flex flex-col gap-2 pt-3">
            <p
              v-if="!remindersQuery.isPending.value && completed.length === 0"
              class="py-10 text-center text-sm text-slate-400"
            >
              Sin recordatorios completados.
            </p>

            <div
              v-for="reminder in completed"
              :key="reminder.id"
              class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 opacity-70"
            >
              <i class="pi pi-check-circle mt-0.5 flex-shrink-0 text-lg text-emerald-500" />

              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-700">{{ reminder.title }}</p>
                <p class="mt-0.5 text-xs text-slate-400">
                  Completado {{ formatCompletedAt(reminder.completed_at) }}
                </p>
                <p v-if="reminder.notes" class="mt-1 text-xs text-slate-400">{{ reminder.notes }}</p>
              </div>

              <button
                type="button"
                class="flex-shrink-0 text-slate-300 hover:text-red-500"
                title="Eliminar"
                :disabled="deleteMutation.isPending.value"
                @click="removeReminder(reminder)"
              >
                <i class="pi pi-trash text-sm" />
              </button>
            </div>

            <p v-if="completed.length === 20" class="pt-1 text-center text-xs text-slate-400">
              Se muestran los últimos 20 completados.
            </p>
          </div>
        </NxTabPanel>
      </NxTabPanels>
    </NxTabs>

    <ReminderFormModal v-model="formModalOpen" />
    <PostponeModal v-model="postponeModalOpen" :reminder="postponingReminder" />
  </div>
</template>
