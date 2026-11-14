<script setup lang="ts">
// Reglas de las reservas por internet: cuanto dura una reserva, cada cuanto se
// ofrece una hora, con cuanta antelacion, y si se confirman solas. El
// interruptor abre o cierra la pagina publica.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxInputNumber, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useReservationSettings } from '../composables/useReservations'
import type { ReservationRules } from '../services/reservationService'

const { notify } = useSystemAlert()
const { settingsQuery, saveRules } = useReservationSettings()
const state = computed(() => settingsQuery.data.value)

const rules = ref<ReservationRules | null>(null)

watch(
  () => state.value?.reservation,
  (value) => {
    if (value) {
      rules.value = { ...value }
    }
  },
  { immediate: true },
)

// Dias cerrados: festivos, un evento privado, vacaciones.
const newBlockedDate = ref('')

function addBlockedDate(): void {
  const day = newBlockedDate.value
  if (rules.value && day && !rules.value.blocked_dates.includes(day)) {
    rules.value.blocked_dates = [...rules.value.blocked_dates, day].sort()
  }
  newBlockedDate.value = ''
}

function removeBlockedDate(day: string): void {
  if (rules.value) {
    rules.value.blocked_dates = rules.value.blocked_dates.filter((d) => d !== day)
  }
}

function blockedLabel(day: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))
}

const canOpen = computed(() => state.value?.hours_configured === true)
const copied = ref(false)

async function save(): Promise<void> {
  if (!rules.value) {
    return
  }
  try {
    await saveRules.mutateAsync({ ...rules.value })
    notify('Reglas guardadas', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar las reglas.'), 'error')
  }
}

async function copyLink(): Promise<void> {
  if (!state.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(state.value.public_url)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    notify('No pudimos copiar el enlace.', 'error')
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <p class="text-sm font-semibold text-slate-800">Reservas por internet</p>
    <p class="mt-1 text-xs text-slate-500">
      El cliente elige personas, fecha y hora dentro de tu horario. Tú las confirmas y les asignas mesa.
    </p>

    <div v-if="rules && state" class="mt-4 flex flex-col gap-5">
      <div class="rounded-lg border border-slate-200 px-4 py-3">
        <label class="flex items-start gap-3">
          <NxSwitch v-model="rules.enabled" class="mt-0.5 shrink-0" :disabled="!canOpen" />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-slate-800">Recibir reservas por internet</span>
            <span class="block text-xs text-slate-500">
              <template v-if="canOpen">Publica la página de reservas de tu negocio.</template>
              <template v-else>Primero configura el horario del negocio: de ahí salen las horas que se ofrecen.</template>
            </span>
          </span>
        </label>

        <div v-if="rules.enabled && canOpen" class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span class="min-w-0 flex-1 truncate text-xs text-slate-500">{{ state.public_url }}</span>
          <NxButton size="sm" variant="outline" @click="copyLink">{{ copied ? 'Copiado' : 'Copiar enlace' }}</NxButton>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <NxInputNumber v-model="rules.duration_minutes" label="Duración de la reserva (min)" :currency="false" :min="30" :max="360" />
        <NxInputNumber v-model="rules.slot_interval_minutes" label="Una hora cada (min)" :currency="false" :min="15" :max="120" />
        <NxInputNumber v-model="rules.closing_buffer_minutes" label="Última hora: antes del cierre (min)" :currency="false" :min="0" :max="240" />
        <NxInputNumber v-model="rules.min_notice_minutes" label="Reservar con al menos (min)" :currency="false" :min="0" :max="2880" />
        <NxInputNumber v-model="rules.max_days_ahead" label="Hasta cuántos días adelante" :currency="false" :min="1" :max="180" />
        <NxInputNumber v-model="rules.max_party_size" label="Máximo de personas por internet" :currency="false" :min="1" :max="40" />
      </div>

      <div>
        <p class="text-sm font-medium text-slate-800">Días cerrados</p>
        <p class="text-xs text-slate-500">En estas fechas no se ofrecen reservas, aunque tu horario diga que abres.</p>
        <div v-if="rules.blocked_dates.length > 0" class="mt-2 flex flex-wrap gap-2">
          <span
            v-for="day in rules.blocked_dates"
            :key="day"
            class="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {{ blockedLabel(day) }}
            <button type="button" class="text-slate-400 hover:text-red-500" :aria-label="`Quitar ${day}`" @click="removeBlockedDate(day)">
              <i class="pi pi-times text-[10px]" />
            </button>
          </span>
        </div>
        <div class="mt-2 flex items-end gap-2">
          <NxInput v-model="newBlockedDate" type="date" label="Cerrar un día" size="sm" class="w-44" />
          <NxButton size="sm" variant="outline" :disabled="!newBlockedDate" @click="addBlockedDate">Agregar</NxButton>
        </div>
      </div>

      <label class="flex items-start gap-3">
        <NxSwitch v-model="rules.auto_confirm" class="mt-0.5 shrink-0" :disabled="state.tables_count === 0" />
        <span class="min-w-0">
          <span class="block text-sm font-medium text-slate-800">Confirmar solas cuando hay mesa libre</span>
          <span class="block text-xs text-slate-500">
            <template v-if="state.tables_count > 0">
              Si hay una mesa libre, la reserva se confirma y se asigna al instante. Si no, queda esperando tu respuesta.
            </template>
            <template v-else>Necesitas tener mesas creadas (en Cuentas abiertas › Mesas) para confirmar solas.</template>
          </span>
        </span>
      </label>

      <NxButton class="self-start" :loading="saveRules.isPending.value" @click="save">Guardar reglas</NxButton>
    </div>
  </div>
</template>
