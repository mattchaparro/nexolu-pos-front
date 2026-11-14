<script setup lang="ts">
// Horario semanal del negocio: por dia, de cero a dos franjas (almuerzo y
// cena). Es el unico lugar donde se escribe el horario: la carta y la pagina
// de enlaces muestran el texto que sale de aqui, y las reservas ofrecen sus
// horas dentro de estas franjas.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useReservationSettings } from '../composables/useReservations'
import { DAY_LABELS, WEEK_DAYS, type WeekDay, type WeeklyHours } from '../services/reservationService'

const MAX_RANGES = 2
const DEFAULT_RANGE = { open: '17:00', close: '22:00' }

const { notify } = useSystemAlert()
const { hoursQuery, saveHours } = useReservationSettings()

const hours = ref<WeeklyHours | null>(null)

watch(
  () => hoursQuery.data.value,
  (state) => {
    if (state) {
      hours.value = structuredClone(state.weekly_hours)
    }
  },
  { immediate: true },
)

const summary = computed(() => hoursQuery.data.value?.summary ?? null)
const configured = computed(() => hoursQuery.data.value?.configured === true)

function isOpen(day: WeekDay): boolean {
  return (hours.value?.[day].length ?? 0) > 0
}

function toggleDay(day: WeekDay, open: boolean): void {
  if (hours.value) {
    hours.value[day] = open ? [{ ...DEFAULT_RANGE }] : []
  }
}

function addRange(day: WeekDay): void {
  const ranges = hours.value?.[day]
  if (ranges && ranges.length < MAX_RANGES) {
    ranges.push({ open: '12:00', close: '15:00' })
  }
}

function removeRange(day: WeekDay, index: number): void {
  hours.value?.[day].splice(index, 1)
}

/** Copia el horario del primer dia abierto a todos: lo mas comun es que sea el mismo. */
function copyToAll(): void {
  if (!hours.value) {
    return
  }
  const source = WEEK_DAYS.map((d) => hours.value![d]).find((ranges) => ranges.length > 0)
  if (!source) {
    return
  }
  for (const day of WEEK_DAYS) {
    hours.value[day] = structuredClone(source)
  }
}

async function save(): Promise<void> {
  if (!hours.value) {
    return
  }
  try {
    await saveHours.mutateAsync(hours.value)
    notify('Horario guardado', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar el horario. Revisa las horas.'), 'error')
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-sm font-semibold text-slate-800">Horario del negocio</p>
        <p class="mt-1 text-xs text-slate-500">
          Lo ven tus clientes en la carta y en tu página de enlaces, y las reservas se ofrecen dentro de estas
          horas.
        </p>
      </div>
      <button
        v-if="hours"
        type="button"
        class="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        @click="copyToAll"
      >
        Usar el mismo horario todos los días
      </button>
    </div>

    <p v-if="!configured && summary" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Hoy se muestra «{{ summary }}», escrito a mano. Al guardar un horario por días lo reemplaza.
    </p>

    <div v-if="hours" class="mt-4 flex flex-col divide-y divide-slate-100">
      <div v-for="day in WEEK_DAYS" :key="day" class="flex flex-wrap items-start gap-x-4 gap-y-2 py-3">
        <label class="flex w-36 shrink-0 items-center gap-3 pt-2 text-sm font-medium text-slate-800">
          <NxSwitch :model-value="isOpen(day)" @update:model-value="toggleDay(day, $event)" />
          {{ DAY_LABELS[day] }}
        </label>

        <div v-if="isOpen(day)" class="flex min-w-0 flex-1 flex-col gap-2">
          <div v-for="(range, index) in hours[day]" :key="index" class="flex items-center gap-2">
            <NxInput v-model="range.open" type="time" label="Abre" size="sm" class="w-32" />
            <span class="text-slate-400">a</span>
            <NxInput v-model="range.close" type="time" label="Cierra" size="sm" class="w-32" />
            <button
              v-if="hours[day].length > 1"
              type="button"
              class="text-slate-300 hover:text-red-500"
              title="Quitar franja"
              @click="removeRange(day, index)"
            >
              <i class="pi pi-times text-sm" />
            </button>
          </div>
          <button
            v-if="hours[day].length < MAX_RANGES"
            type="button"
            class="self-start text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            @click="addRange(day)"
          >
            + Agregar otra franja (almuerzo y cena)
          </button>
        </div>
        <p v-else class="pt-2 text-sm text-slate-400">Cerrado</p>
      </div>
    </div>

    <p v-if="configured && summary" class="mt-2 text-xs text-slate-500">Se muestra así: {{ summary }}</p>

    <NxButton class="mt-4" :loading="saveHours.isPending.value" @click="save">Guardar horario</NxButton>
  </div>
</template>
