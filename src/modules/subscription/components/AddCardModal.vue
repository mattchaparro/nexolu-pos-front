<script setup lang="ts">
import { ref } from 'vue'

import { NxButton, NxModal, NxSwitch } from '@/ui'

import CardPaymentFields from './CardPaymentFields.vue'
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
const save = ref(true)

function submit(): void {
  if (!cardValid.value) {
    return
  }
  const card: CardInput = {
    number: number.value,
    cvc: cvc.value,
    exp_month: expMonth.value.padStart(2, '0'),
    exp_year: expYear.value.padStart(2, '0'),
    card_holder: cardHolder.value.trim(),
  }
  const label = save.value ? `Tarjeta •••• ${number.value.slice(-4)}` : null
  emit('submit', card, label)
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Pagar con tarjeta" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p class="text-xs text-slate-500">Tu tarjeta se envía directo a Wompi, nunca pasa por nuestros servidores.</p>
      <CardPaymentFields
        v-model:card-holder="cardHolder"
        v-model:number="number"
        v-model:exp-month="expMonth"
        v-model:exp-year="expYear"
        v-model:cvc="cvc"
        v-model:valid="cardValid"
        :disabled="paying"
      />
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <NxSwitch v-model="save" />
        Guardar para pagos futuros (sin volver a escribirla)
      </label>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" :disabled="paying" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-[2]" :loading="paying" :disabled="!cardValid" @click="submit">Pagar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
