<script setup lang="ts">
// Una reserva en la lista del dia: hora, quien, cuantos, mesa y las acciones
// que corresponden a su estado. Confirmar asigna sola la mesa mas ajustada;
// la mesa se puede cambiar despues desde el selector.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useTables } from '@/modules/open-tabs/composables/useTables'
import { NxButton, NxSelect } from '@/ui'

import { useReservationMutations } from '../composables/useReservations'
import ReservationRescheduleModal from './ReservationRescheduleModal.vue'
import type { Reservation } from '../services/reservationService'
import { isLive, STATUS_LABELS, STATUS_TONES, timeLabel, whatsappUrl } from '../support/reservationText'

const props = defineProps<{ reservation: Reservation }>()

const router = useRouter()
const tablesQuery = useTables()
const { confirm, assignTable, act } = useReservationMutations()

const tables = computed(() => (tablesQuery.data.value ?? []).filter((t) => t.is_active && t.capacity >= props.reservation.party_size))
const hasTables = computed(() => (tablesQuery.data.value ?? []).some((t) => t.is_active))

const rescheduleOpen = ref(false)

const busy = computed(() => confirm.isPending.value || assignTable.isPending.value || act.isPending.value)

function changeTable(value: unknown): void {
  const tableId = typeof value === 'number' ? value : null
  if (tableId && tableId !== props.reservation.table_id) {
    assignTable.mutate({ id: props.reservation.id, tableId })
  }
}

/** Al sentarlos se abre su cuenta en esa mesa: la reserva se liga sola al abrirla. */
function seat(): void {
  act.mutate(
    { id: props.reservation.id, action: 'seat' },
    {
      onSuccess: () => {
        if (props.reservation.table_id) {
          router.push({ name: 'open-tabs.index' })
        }
      },
    },
  )
}

const whatsapp = computed(() => {
  const r = props.reservation
  return whatsappUrl(r.customer_phone, `Hola ${r.customer_name.split(' ')[0]}, te escribimos por tu reserva de las ${timeLabel(r.starts_at)}.`)
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4" :class="{ 'opacity-60': !isLive(reservation) }">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-slate-900">{{ timeLabel(reservation.starts_at) }}</span>
          <span class="truncate text-sm font-semibold text-slate-800">{{ reservation.customer_name }}</span>
        </p>
        <p class="mt-0.5 text-xs text-slate-500">
          {{ reservation.party_size }} {{ reservation.party_size === 1 ? 'persona' : 'personas' }}
          <span aria-hidden="true"> · </span>
          <a :href="whatsapp" target="_blank" rel="noopener" class="font-medium text-indigo-600 hover:underline">
            {{ reservation.customer_phone }}
          </a>
          <template v-if="reservation.source === 'web'"> · por internet</template>
        </p>
      </div>
      <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="STATUS_TONES[reservation.status]">
        {{ STATUS_LABELS[reservation.status] }}
      </span>
    </div>

    <p v-if="reservation.notes" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <i class="pi pi-comment mr-1 text-slate-400" />{{ reservation.notes }}
    </p>

    <div v-if="isLive(reservation) && hasTables" class="mt-3 max-w-xs">
      <NxSelect
        :model-value="reservation.table_id"
        :options="tables"
        option-label="name"
        option-value="id"
        label="Mesa"
        size="sm"
        placeholder="Sin mesa"
        :disabled="busy"
        @update:model-value="changeTable"
      />
    </div>

    <div v-if="isLive(reservation)" class="mt-3 flex flex-wrap gap-2">
      <template v-if="reservation.status === 'pending'">
        <NxButton size="sm" :loading="confirm.isPending.value" :disabled="busy" @click="confirm.mutate({ id: reservation.id })">
          Confirmar
        </NxButton>
        <NxButton size="sm" variant="outline" :disabled="busy" @click="rescheduleOpen = true">Cambiar hora</NxButton>
        <NxButton size="sm" variant="outline" :disabled="busy" @click="act.mutate({ id: reservation.id, action: 'decline' })">
          Rechazar
        </NxButton>
      </template>
      <template v-else-if="reservation.status === 'confirmed'">
        <NxButton size="sm" :disabled="busy" @click="seat">Llegó, sentar</NxButton>
        <NxButton size="sm" variant="outline" :disabled="busy" @click="rescheduleOpen = true">Cambiar hora</NxButton>
        <NxButton size="sm" variant="outline" :disabled="busy" @click="act.mutate({ id: reservation.id, action: 'no-show' })">
          No llegó
        </NxButton>
        <NxButton size="sm" variant="outline" :disabled="busy" @click="act.mutate({ id: reservation.id, action: 'cancel' })">
          Cancelar
        </NxButton>
      </template>
      <p v-else class="text-xs text-slate-500">
        Se cierra sola al cobrar la cuenta de la mesa<template v-if="reservation.table"> {{ reservation.table.name }}</template>.
      </p>
    </div>

    <ReservationRescheduleModal v-model="rescheduleOpen" :reservation="reservation" />
  </div>
</template>
