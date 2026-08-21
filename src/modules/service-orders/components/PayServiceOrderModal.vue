<script setup lang="ts">
// Registrar abono a una orden de servicio - mismo patron que
// AddLayawayPaymentModal/PayPurchaseModal (el backend tambien capea el
// monto al saldo y prohibe credito/fiado, ver ServiceOrderService::pay()).
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import type { ServiceOrder } from '@/types/serviceOrder'
import { NxButton, NxInputNumber, NxModal, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import { useServiceOrderMutations } from '../composables/useServiceOrderMutations'

const props = defineProps<{
  modelValue: boolean
  order: ServiceOrder | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const { payMutation } = useServiceOrderMutations()

const nonCreditPaymentMethods = computed(
  () => business.value?.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)) ?? [],
)

const amount = ref<number | null>(null)
const paymentMethod = ref<string | null>(null)
const notes = ref('')
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      amount.value = props.order?.balance ?? null
      paymentMethod.value = nonCreditPaymentMethods.value[0]?.id ?? null
      notes.value = ''
      formError.value = null
    }
  },
)

// order.balance llega como string desde el backend (cast decimal:2 de
// Laravel se serializa como string en JSON) - Number() para poder
// compararlo/restarlo.
const balance = computed(() => Number(props.order?.balance ?? 0))
const remainingAfterPayment = computed(() => Math.max(0, balance.value - (amount.value ?? 0)))
const exceedsBalance = computed(() => (amount.value ?? 0) > balance.value + 0.02)

const canSubmit = computed(() => (amount.value ?? 0) > 0 && !exceedsBalance.value && paymentMethod.value !== null)

async function submit(): Promise<void> {
  if (!props.order || !canSubmit.value || amount.value === null || paymentMethod.value === null) {
    return
  }
  formError.value = null

  try {
    await payMutation.mutateAsync({
      id: props.order.id,
      payload: { amount: amount.value, payment_method: paymentMethod.value, notes: notes.value.trim() || null },
    })
    notify('Abono registrado')
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos registrar el abono.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="order ? `Abonar — ${order.service_name}` : 'Abonar'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="order" class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        Saldo pendiente: <strong class="text-slate-900">{{ formatCop(order.balance) }}</strong>
      </p>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInputNumber v-model="amount" label="Monto a abonar" :min="0" :max="balance" />
      <p
        v-if="amount !== null"
        class="rounded-lg px-3 py-1.5 text-sm font-semibold"
        :class="exceedsBalance ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'"
      >
        {{ exceedsBalance ? 'El monto no puede superar el saldo pendiente.' : `Quedaría debiendo: ${formatCop(remainingAfterPayment)}` }}
      </p>

      <div>
        <p class="mb-2 text-sm font-medium text-slate-700">Método de pago</p>
        <PaymentMethodPicker :methods="nonCreditPaymentMethods" :model-value="paymentMethod" @update:model-value="paymentMethod = $event" />
      </div>

      <NxTextarea v-model="notes" label="Nota (opcional)" :rows="1" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-none" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :disabled="!canSubmit" :loading="payMutation.isPending.value" @click="submit">
          Confirmar abono
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
