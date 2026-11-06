<script setup lang="ts">
// Abonar/pagar una compra a credito - puerto del modal "Abonar" de
// Purchases/Index.vue y Show.vue del legacy (mismo formulario en los dos
// lugares, aca es un solo componente reusado).
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import type { Purchase } from '@/types/purchase'
import { NxButton, NxInputNumber, NxModal, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { isCashPaymentMethodId, isCreditPaymentMethodId } from '@/utils/paymentMethod'
import { formatCop } from '@/utils/formatCop'

import { usePurchaseMutations } from '../composables/usePurchaseMutations'

const props = defineProps<{
  modelValue: boolean
  purchase: Purchase | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const { payMutation } = usePurchaseMutations()

const nonCreditPaymentMethods = computed(
  () => business.value?.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)) ?? [],
)

const amount = ref<number | null>(null)
const paymentMethod = ref<string | null>(null)
// Igual que en Gastos: nace apagado, el abono a un proveedor suele salir de la
// cuenta del local y no del efectivo del dia.
const paidFromCashRegister = ref(false)
const isCash = computed(() => isCashPaymentMethodId(paymentMethod.value))
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      amount.value = props.purchase?.balance ?? null
      paymentMethod.value = nonCreditPaymentMethods.value[0]?.id ?? null
      paidFromCashRegister.value = false
      formError.value = null
    }
  },
)

const canSubmit = computed(() => (amount.value ?? 0) > 0 && paymentMethod.value !== null)

async function submit(): Promise<void> {
  if (!props.purchase || !canSubmit.value || amount.value === null || paymentMethod.value === null) {
    return
  }
  formError.value = null

  try {
    await payMutation.mutateAsync({
      id: props.purchase.id,
      payload: {
        amount: amount.value,
        payment_method: paymentMethod.value,
        paid_from_cash_register: isCash.value && paidFromCashRegister.value,
      },
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
    :title="purchase ? `Abonar — ${purchase.supplier?.name ?? 'Sin proveedor'}` : 'Abonar'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="purchase" class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        Saldo pendiente: <strong class="text-slate-900">{{ formatCop(purchase.balance) }}</strong>
      </p>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInputNumber v-model="amount" label="Monto a abonar" :min="0" :max="purchase.balance" />
      <p class="-mt-2 text-[11px] text-slate-400">
        Deja el monto completo para saldar la compra, o ajústalo para un abono parcial.
      </p>

      <div>
        <p class="mb-2 text-sm font-medium text-slate-700">Método de pago</p>
        <PaymentMethodPicker :methods="nonCreditPaymentMethods" :model-value="paymentMethod" @update:model-value="paymentMethod = $event" />
      </div>

      <label v-if="isCash" class="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
        <NxSwitch v-model="paidFromCashRegister" class="mt-0.5 shrink-0" />
        <span>
          <span class="block text-sm font-medium text-slate-700">Salió de la caja del día</span>
          <span class="block text-xs text-slate-500">Se descuenta del cierre y del turno. Si fue de otra plata, déjalo apagado.</span>
        </span>
      </label>
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
