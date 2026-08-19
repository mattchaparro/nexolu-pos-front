<script setup lang="ts">
// Abrir turno: solo pide la base inicial de efectivo (lo que ya habia en la
// caja antes de vender) y una nota opcional - lo minimo para que el cuadre
// del cierre parta de un numero correcto.
import { ref } from 'vue'

import { NxButton, NxInputNumber, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useCashShiftMutations } from '../composables/useCashShiftMutations'

const openingCash = ref<number | null>(0)
const openingNote = ref('')
const formError = ref<string | null>(null)

const { openMutation } = useCashShiftMutations()

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

    <NxInputNumber v-model="openingCash" label="Base inicial de efectivo" required />
    <NxTextarea v-model="openingNote" label="Nota (opcional)" :rows="2" />

    <NxButton :disabled="openingCash === null" :loading="openMutation.isPending.value" @click="submit">
      Abrir turno
    </NxButton>
  </div>
</template>
