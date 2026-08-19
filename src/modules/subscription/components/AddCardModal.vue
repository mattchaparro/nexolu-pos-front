<script setup lang="ts">
import { ref } from 'vue'

import { NxButton, NxInput, NxModal, NxSwitch } from '@/ui'

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
const save = ref(true)

function submit(): void {
  const cleanNumber = number.value.replace(/\s+/g, '')
  const card: CardInput = {
    number: cleanNumber,
    cvc: cvc.value,
    exp_month: expMonth.value,
    exp_year: expYear.value,
    card_holder: cardHolder.value,
  }
  const label = save.value ? `Tarjeta •••• ${cleanNumber.slice(-4)}` : null
  emit('submit', card, label)
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Pagar con tarjeta" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p class="text-xs text-slate-500">Tu tarjeta se envía directo a Wompi, nunca pasa por nuestros servidores.</p>
      <NxInput v-model="cardHolder" label="Nombre en la tarjeta" required />
      <NxInput v-model="number" label="Número de tarjeta" required autocomplete="cc-number" />
      <div class="grid grid-cols-3 gap-3">
        <NxInput v-model="expMonth" label="Mes (MM)" required placeholder="12" />
        <NxInput v-model="expYear" label="Año (AA)" required placeholder="29" />
        <NxInput v-model="cvc" label="CVC" required autocomplete="cc-csc" />
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <NxSwitch v-model="save" />
        Guardar para pagos futuros (sin volver a escribirla)
      </label>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" :disabled="paying" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-[2]" :loading="paying" @click="submit">Pagar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
