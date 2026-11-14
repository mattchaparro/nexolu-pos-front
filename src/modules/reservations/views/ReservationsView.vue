<script setup lang="ts">
// Reservas de mesa: lo del dia (con navegacion entre dias) y, en otra pestaña,
// el horario del negocio y las reglas de las reservas por internet. Las que
// llegan por internet aparecen "por confirmar"; confirmar asigna sola la mesa
// mas ajustada que este libre.
import { computed, ref } from 'vue'

import { NxButton, NxInput, NxPageHeader } from '@/ui'

import BusinessHoursEditor from '../components/BusinessHoursEditor.vue'
import ReservationCard from '../components/ReservationCard.vue'
import ReservationFormModal from '../components/ReservationFormModal.vue'
import ReservationRulesCard from '../components/ReservationRulesCard.vue'
import { useReservationList } from '../composables/useReservations'
import type { ReservationFilters, ReservationStatus } from '../services/reservationService'
import { dayLabel, isLive, shiftDay, todayIso } from '../support/reservationText'

type Tab = 'day' | 'settings'
type Filter = 'all' | 'pending' | 'confirmed'

const tab = ref<Tab>('day')
const day = ref(todayIso())
const filter = ref<Filter>('all')
const formOpen = ref(false)

const filters = computed<ReservationFilters>(() => ({ date: day.value }))
const listQuery = useReservationList(filters)

const FILTER_STATUSES: Record<Filter, ReservationStatus[] | null> = {
  all: null,
  pending: ['pending'],
  confirmed: ['confirmed', 'seated'],
}

const all = computed(() => listQuery.data.value ?? [])
const visible = computed(() => {
  const statuses = FILTER_STATUSES[filter.value]
  return statuses ? all.value.filter((r) => statuses.includes(r.status)) : all.value
})

const pendingCount = computed(() => all.value.filter((r) => r.status === 'pending').length)
const live = computed(() => all.value.filter(isLive))
const guests = computed(() => live.value.reduce((sum, r) => sum + r.party_size, 0))
const isToday = computed(() => day.value === todayIso())
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NxPageHeader title="Reservas" subtitle="Las mesas que te reservaron, y cuándo." icon="pi pi-calendar-plus" compact />
      <NxButton size="sm" @click="formOpen = true">
        <i class="pi pi-plus mr-1.5 text-xs" />Nueva reserva
      </NxButton>
    </div>

    <div class="flex gap-1 border-b border-slate-200">
      <button
        v-for="item in [{ id: 'day', label: 'Reservas' }, { id: 'settings', label: 'Horario y reglas' }] as { id: Tab; label: string }[]"
        :key="item.id"
        type="button"
        class="-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition"
        :class="tab === item.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'"
        @click="tab = item.id"
      >
        {{ item.label }}
        <span
          v-if="item.id === 'day' && pendingCount > 0"
          class="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"
        >
          {{ pendingCount }}
        </span>
      </button>
    </div>

    <template v-if="tab === 'day'">
      <!-- Dia -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
          aria-label="Día anterior"
          @click="day = shiftDay(day, -1)"
        >
          <i class="pi pi-chevron-left text-xs" />
        </button>
        <div class="min-w-0 flex-1 text-center sm:flex-none sm:px-4">
          <p class="text-sm font-bold text-slate-900">{{ dayLabel(day) }}</p>
          <p class="text-xs text-slate-500">
            {{ live.length }} {{ live.length === 1 ? 'reserva' : 'reservas' }} · {{ guests }}
            {{ guests === 1 ? 'persona' : 'personas' }}
          </p>
        </div>
        <button
          type="button"
          class="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
          aria-label="Día siguiente"
          @click="day = shiftDay(day, 1)"
        >
          <i class="pi pi-chevron-right text-xs" />
        </button>
        <NxButton v-if="!isToday" size="sm" variant="outline" @click="day = todayIso()">Hoy</NxButton>
        <NxInput v-model="day" type="date" label="Ir a" size="sm" class="w-40" />
      </div>

      <div class="flex gap-2">
        <button
          v-for="item in [{ id: 'all', label: 'Todas' }, { id: 'pending', label: 'Por confirmar' }, { id: 'confirmed', label: 'Confirmadas' }] as { id: Filter; label: string }[]"
          :key="item.id"
          type="button"
          class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
          :class="filter === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="filter = item.id"
        >
          {{ item.label }}
        </button>
      </div>

      <p v-if="listQuery.isError.value" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        No pudimos cargar las reservas. Intenta de nuevo.
      </p>
      <div v-else-if="listQuery.isPending.value" class="flex flex-col gap-3">
        <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div v-else-if="visible.length === 0" class="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
        <i class="pi pi-calendar text-3xl text-slate-300" />
        <p class="mt-2 text-sm text-slate-500">No hay reservas para este día.</p>
      </div>
      <div v-else class="flex flex-col gap-3">
        <ReservationCard v-for="reservation in visible" :key="reservation.id" :reservation="reservation" />
      </div>
    </template>

    <template v-else>
      <BusinessHoursEditor />
      <ReservationRulesCard />
    </template>

    <ReservationFormModal v-model="formOpen" :default-date="day" />
  </div>
</template>
