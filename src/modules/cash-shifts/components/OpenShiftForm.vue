<script setup lang="ts">
// Abrir turno: la base inicial de efectivo (lo que ya habia en la caja antes
// de vender) y una nota. La base viene prellenada con lo que dejo el ultimo
// cierre de esta caja: antes arrancaba en $0, que invitaba a abrir sin mirar.
// Si el cajero encuentra otra cosa, la cambia y tiene que explicar la
// diferencia - el faltante queda escrito cuando se detecta, no un dia despues
// en el cierre (caso real: Central Cell, 17-sep-2026, en el POS legacy).
import { computed, ref } from 'vue'

import type { ExpectedOpening } from '@/types/cashShift'
import { NxButton, NxInputNumber, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useCashShiftMutations } from '../composables/useCashShiftMutations'

const props = defineProps<{
  expectedOpening?: ExpectedOpening | null
}>()

const openingCash = ref<number | null>(props.expectedOpening?.amount ?? 0)
const openingNote = ref('')
const formError = ref<string | null>(null)

const { openMutation } = useCashShiftMutations()

const closingDateLabel = computed(() =>
  props.expectedOpening
    ? new Date(`${props.expectedOpening.closing_date}T00:00:00`).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
      })
    : '',
)

// Nulo si no hay base con la cual comparar o si coincide.
const openingDifference = computed<number | null>(() => {
  if (!props.expectedOpening || openingCash.value === null) {
    return null
  }
  const diff = openingCash.value - props.expectedOpening.amount
  return Math.abs(diff) < 0.01 ? null : diff
})

const noteRequired = computed(() => openingDifference.value !== null)
const canSubmit = computed(
  () => openingCash.value !== null && (!noteRequired.value || openingNote.value.trim() !== ''),
)

async function submit(): Promise<void> {
  if (openingCash.value === null) {
    return
  }
  formError.value = null
  try {
    await openMutation.mutateAsync({
      opening_cash: openingCash.value,
      opening_note: openingNote.value.trim() || undefined,
    })
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos abrir el turno.')
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="flex flex-col items-center gap-2 text-center">
      <div class="rounded-full bg-indigo-50 p-3">
        <i class="pi pi-wallet text-2xl text-indigo-600" />
      </div>
      <h2 class="text-base font-bold text-slate-900">Abrir turno de caja</h2>
      <p class="text-sm text-slate-500">Registra cuánto efectivo hay en la caja antes de empezar a vender.</p>
    </div>

    <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

    <div class="flex flex-col gap-1">
      <NxInputNumber v-model="openingCash" label="Base inicial de efectivo" required />
      <p v-if="expectedOpening" class="text-xs text-slate-500">
        Base que dejó el cierre del {{ closingDateLabel }}: {{ formatCop(expectedOpening.amount) }}
      </p>
    </div>

    <div
      v-if="openingDifference !== null && expectedOpening"
      class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <p class="font-semibold">
        {{ openingDifference < 0 ? 'Faltan' : 'Sobran' }} {{ formatCop(Math.abs(openingDifference)) }}
        respecto a la base que dejó el cierre del {{ closingDateLabel }}.
      </p>
      <p class="mt-1 text-xs text-amber-800">Si es lo que hay en la caja, déjalo así y anota abajo qué pasó.</p>
    </div>

    <NxTextarea
      v-model="openingNote"
      :label="noteRequired ? 'Nota (obligatoria)' : 'Nota (opcional)'"
      :required="noteRequired"
      :rows="2"
    />

    <NxButton :disabled="!canSubmit" :loading="openMutation.isPending.value" @click="submit">
      Abrir turno
    </NxButton>
  </div>
</template>
