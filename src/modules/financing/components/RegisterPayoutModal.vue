<script setup lang="ts">
// Llego el giro de la financiadora por un credito: siempre completo y uno por
// credito, asi que solo se pide cuando, por donde y la referencia.
import { ref, watch } from 'vue'

import type { Business } from '@/types/business'
import type { FinancingCredit, RegisterPayoutPayload } from '@/types/financing'
import { NxButton, NxDatePicker, NxInput, NxModal, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

const props = defineProps<{
  modelValue: boolean
  credit: FinancingCredit | null
  business: Business | undefined
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: RegisterPayoutPayload]
}>()

const paidAt = ref(toLocalDateIso())
const payoutMethod = ref<string | null>(null)
const payoutReference = ref('')
const notes = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      paidAt.value = toLocalDateIso()
      payoutMethod.value = null
      payoutReference.value = ''
      notes.value = ''
    }
  },
)

function submit(): void {
  emit('confirm', {
    paid_at: paidAt.value,
    payout_method: payoutMethod.value,
    payout_reference: payoutReference.value.trim() || null,
    notes: notes.value.trim() || null,
  })
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Registrar pago de la financiadora" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="credit" class="flex flex-col gap-3">
      <div class="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">
        <p>
          <strong>{{ credit.provider.name }}</strong> giró
          <strong>{{ formatCop(credit.amount) }}</strong>
        </p>
        <p class="text-xs text-indigo-700">
          {{ credit.customer_name || 'Cliente sin nombre' }}
          <span v-if="credit.approval_number"> · Crédito {{ credit.approval_number }}</span>
        </p>
      </div>

      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>

      <NxDatePicker v-model="paidAt" label="Fecha en que llegó" :max-date="toLocalDateIso()" />
      <NxSelect
        :model-value="payoutMethod"
        :options="business?.payment_methods ?? []"
        option-label="label"
        option-value="id"
        label="Dónde llegó (opcional)"
        @update:model-value="payoutMethod = $event as string | null"
      />
      <NxInput v-model="payoutReference" label="Referencia de la transferencia (opcional)" />
      <NxInput v-model="notes" label="Nota (opcional)" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-none" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="submitting" @click="submit">Marcar como pagado</NxButton>
      </div>
    </template>
  </NxModal>
</template>
