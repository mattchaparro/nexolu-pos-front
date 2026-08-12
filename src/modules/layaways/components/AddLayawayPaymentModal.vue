<script setup lang="ts">
// Registrar abono a un apartado - puerto del modal "Registrar abono" de
// Layaways/Show.vue del legacy. Mismo patron que PayPurchaseModal (el
// backend tambien capea el monto al saldo y prohibe credito/fiado como
// metodo, ver LayawayService::addPayment()).
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import type { Layaway } from '@/types/layaway'
import { NxButton, NxInputNumber, NxModal, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import { useLayawayMutations } from '../composables/useLayawayMutations'

const props = defineProps<{
  modelValue: boolean
  layaway: Layaway | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const { payMutation } = useLayawayMutations()

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
      amount.value = props.layaway?.balance ?? null
      paymentMethod.value = nonCreditPaymentMethods.value[0]?.id ?? null
      notes.value = ''
      formError.value = null
    }
  },
)

const canSubmit = computed(() => (amount.value ?? 0) > 0 && paymentMethod.value !== null)

async function submit(): Promise<void> {
  if (!props.layaway || !canSubmit.value || amount.value === null || paymentMethod.value === null) {
    return
  }
  formError.value = null

  try {
    await payMutation.mutateAsync({
      id: props.layaway.id,
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
    :title="layaway ? `Abonar — ${layaway.customer_name || 'Cliente sin nombre'}` : 'Abonar'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="layaway" class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        Saldo pendiente: <strong class="text-slate-900">{{ formatCop(layaway.balance) }}</strong>
      </p>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInputNumber v-model="amount" label="Monto a abonar" :min="0" :max="layaway.balance" />
      <p class="-mt-2 text-[11px] text-slate-400">
        Deja el monto completo para saldar el apartado (se completa automático), o ajústalo para un abono parcial.
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
