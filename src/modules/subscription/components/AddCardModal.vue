<script setup lang="ts">
import { ref } from 'vue'

import { NxButton, NxModal } from '@/ui'

import BillingDetailsFields from './BillingDetailsFields.vue'
import CardPaymentFields from './CardPaymentFields.vue'
import { useBillingCheckout } from '../composables/useBillingCheckout'
import type { CardInput } from '../services/wompiTokenization'

defineProps<{
  modelValue: boolean
  paying: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [card: CardInput, saveLabel: string | null]
}>()

const cardHolder = ref('')
const number = ref('')
const expMonth = ref('')
const expYear = ref('')
const cvc = ref('')
const cardValid = ref(false)

const billing = useBillingCheckout()

function submit(): void {
  if (!cardValid.value || !billing.valid.value) {
    return
  }
  billing.save()
  const card: CardInput = {
    number: number.value,
    cvc: cvc.value,
    exp_month: expMonth.value.padStart(2, '0'),
    exp_year: expYear.value.padStart(2, '0'),
    card_holder: cardHolder.value.trim(),
  }
  const label = `Tarjeta •••• ${number.value.slice(-4)}`
  emit('submit', card, label)
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Pagar con tarjeta" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p class="text-xs text-slate-500">Tu tarjeta se envía directo a Wompi, nunca pasa por nuestros servidores.</p>

      <BillingDetailsFields
        v-model:document-type="billing.documentType.value"
        v-model:document-number="billing.documentNumber.value"
        v-model:full-name="billing.fullName.value"
        v-model:phone="billing.phone.value"
        v-model:email="billing.email.value"
        v-model:address="billing.address.value"
        v-model:city="billing.city.value"
        v-model:valid="billing.valid.value"
      />

      <CardPaymentFields
        v-model:card-holder="cardHolder"
        v-model:number="number"
        v-model:exp-month="expMonth"
        v-model:exp-year="expYear"
        v-model:cvc="cvc"
        v-model:valid="cardValid"
        :disabled="paying"
      />
      <!-- Es una suscripcion: el medio con el que se paga queda para el
           cobro automatico de cada periodo. No es opcional (ver
           subscriptions:renew en el API). -->
      <div class="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
        <span class="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
          Pago automático
        </span>
        <p class="text-xs text-indigo-900">Esta tarjeta queda registrada y cada periodo intentaremos el cobro de tu suscripción automáticamente. Te avisamos por WhatsApp antes de cobrar.</p>
      </div>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" :disabled="paying" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-[2]" :loading="paying" :disabled="!cardValid || !billing.valid.value" @click="submit">Pagar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
