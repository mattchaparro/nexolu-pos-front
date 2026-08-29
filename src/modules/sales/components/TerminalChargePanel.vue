<script setup lang="ts">
// Cobrar en el datáfono, desde el modal de cobro.
//
// No es un medio de pago más: los de arriba REGISTRAN cómo te pagaron, esto
// EJECUTA el cobro. Por eso va aparte y tiene un estado de espera — entre
// que el monto aparece en el aparato y el cliente pasa la tarjeta hay un
// rato en el que no se sabe nada.
import { computed, ref, watch } from 'vue'

import { NxButton, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useTerminalCharge, useTerminals } from '../composables/useTerminalCharge'

const props = defineProps<{ amount: number; disabled?: boolean }>()
const emit = defineEmits<{ approved: [reference: string] }>()

const terminalsQuery = useTerminals()
const { charge, errorMessage, starting, isWaiting, isApproved, start, cancel, reset } =
  useTerminalCharge()

const usableTerminals = computed(() => (terminalsQuery.data.value ?? []).filter((t) => t.is_usable))
const selectedTerminalId = ref<number | null>(null)

watch(
  usableTerminals,
  (terminals) => {
    if (selectedTerminalId.value === null && terminals.length > 0) {
      selectedTerminalId.value = terminals[0].id
    }
  },
  { immediate: true },
)

// El cobro aprobado es lo que autoriza a facturar: se avisa hacia arriba y
// el modal cierra la venta con esa referencia.
watch(isApproved, (approved) => {
  if (approved && charge.value) {
    emit('approved', charge.value.reference)
  }
})

// Si cambia el total mientras se espera, lo cobrado deja de servir: el
// backend lo rechazaría igual, pero es mejor decirlo antes.
watch(
  () => props.amount,
  () => {
    if (charge.value && charge.value.amount !== props.amount) {
      void cancel()
    }
  },
)

const failed = computed(
  () => charge.value !== null && !isWaiting.value && !isApproved.value && charge.value.status !== 'consumed',
)

const FAILURE_LABELS: Record<string, string> = {
  declined: 'La tarjeta fue rechazada.',
  expired: 'Se agotó la espera.',
  voided: 'El cobro fue anulado.',
  error: 'El cobro no se completó.',
}
</script>

<template>
  <div v-if="usableTerminals.length > 0" class="rounded-xl border border-slate-200 p-3">
    <p class="mb-1 text-sm font-semibold text-slate-700">Cobrar con datáfono</p>
    <p class="mb-3 text-[11px] text-slate-400">
      El monto aparece en el aparato y esperamos a que el cliente pase la tarjeta.
    </p>

    <!-- Elegir y disparar -->
    <template v-if="!charge">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <NxSelect
          v-if="usableTerminals.length > 1"
          v-model="selectedTerminalId"
          class="flex-1"
          :options="usableTerminals"
          option-label="name"
          option-value="id"
          label="Datáfono"
        />
        <NxButton
          :disabled="disabled || selectedTerminalId === null || amount <= 0"
          :loading="starting"
          @click="selectedTerminalId !== null && start(selectedTerminalId, amount)"
        >
          Enviar {{ formatCop(amount) }} al datáfono
        </NxButton>
      </div>
      <p v-if="errorMessage" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ errorMessage }}
      </p>
    </template>

    <!-- Esperando al cliente -->
    <div v-else-if="isWaiting" class="flex flex-col gap-2">
      <div class="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2.5">
        <i class="pi pi-spin pi-spinner text-indigo-600" />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-indigo-900">Esperando al cliente…</p>
          <p class="text-xs text-indigo-700">
            {{ formatCop(charge.amount) }} en {{ charge.terminal ?? 'el datáfono' }}. Si está
            bloqueado, el cobro aparece al desbloquearlo.
          </p>
        </div>
      </div>
      <NxButton variant="ghost" size="sm" @click="cancel">Cancelar la espera</NxButton>
      <p class="text-[11px] text-slate-400">
        Cancelar no borra el cobro del aparato. Si el cliente igual paga, anúlalo desde Bold.
      </p>
    </div>

    <!-- Cobrado -->
    <div v-else-if="isApproved" class="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5">
      <i class="pi pi-check-circle text-emerald-600" />
      <p class="text-sm font-semibold text-emerald-900">
        Cobrado {{ formatCop(charge.amount) }}. Confirma para cerrar la venta.
      </p>
    </div>

    <!-- Falló -->
    <div v-else-if="failed" class="flex flex-col gap-2">
      <p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ charge.failure_reason ?? FAILURE_LABELS[charge.status] ?? 'El cobro no se completó.' }}
      </p>
      <NxButton variant="outline" size="sm" @click="reset">Intentar de nuevo</NxButton>
    </div>
  </div>
</template>
