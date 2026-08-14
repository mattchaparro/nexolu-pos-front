<script setup lang="ts">
// Cobrar un fiado - a diferencia del "Abonar" de Apartados, un fiado se
// cobra completo de una sola vez (sin monto editable, ver
// ReceivableService::collect()). Solo pide el medio de pago (nunca
// 'credit', el backend lo rechaza) y, si faltan, los datos del cliente.
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import type { Receivable } from '@/types/receivable'
import { NxButton, NxInput, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import { useReceivableMutations } from '../composables/useReceivableMutations'

const props = defineProps<{
  modelValue: boolean
  receivable: Receivable | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const { collectMutation } = useReceivableMutations()

const nonCreditPaymentMethods = computed(
  () => business.value?.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)) ?? [],
)

const paymentMethod = ref<string | null>(null)
const customerName = ref('')
const customerPhone = ref('')
const customerIdentification = ref('')
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      paymentMethod.value = nonCreditPaymentMethods.value[0]?.id ?? null
      customerName.value = props.receivable?.customer_name ?? ''
      customerPhone.value = props.receivable?.customer_phone ?? ''
      customerIdentification.value = props.receivable?.customer_identification ?? ''
      formError.value = null
    }
  },
)

const missingCustomerData = computed(
  () => !props.receivable?.customer_name && !props.receivable?.customer_phone && !props.receivable?.customer_identification,
)

async function submit(): Promise<void> {
  if (!props.receivable || !paymentMethod.value) {
    return
  }
  formError.value = null

  try {
    await collectMutation.mutateAsync({
      id: props.receivable.id,
      payload: {
        payment_method: paymentMethod.value,
        customer_name: customerName.value.trim() || undefined,
        customer_phone: customerPhone.value.trim() || undefined,
        customer_identification: customerIdentification.value.trim() || undefined,
      },
    })
    notify('Fiado cobrado')
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos cobrar el fiado.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="receivable ? `Cobrar fiado — ${receivable.customer_name || 'Cliente sin nombre'}` : 'Cobrar fiado'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="receivable" class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        Saldo a cobrar: <strong class="text-slate-900">{{ formatCop(receivable.balance) }}</strong>
      </p>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <div>
        <p class="mb-2 text-sm font-medium text-slate-700">Método de pago</p>
        <PaymentMethodPicker :methods="nonCreditPaymentMethods" :model-value="paymentMethod" @update:model-value="paymentMethod = $event" />
      </div>

      <div v-if="missingCustomerData" class="flex flex-col gap-3">
        <p class="text-xs text-slate-400">
          Esta venta se registró sin datos del cliente. Puedes completarlos ahora (opcional).
        </p>
        <NxInput v-model="customerName" label="Nombre (opcional)" />
        <NxInput v-model="customerPhone" label="Teléfono (opcional)" />
        <NxInput v-model="customerIdentification" label="Cédula (opcional)" />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-none" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :disabled="!paymentMethod" :loading="collectMutation.isPending.value" @click="submit">
          Confirmar cobro
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
