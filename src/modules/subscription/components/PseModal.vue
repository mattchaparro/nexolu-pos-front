<script setup lang="ts">
import { computed, ref } from 'vue'

import type { PseFinancialInstitution } from '@/types/paymentSource'
import { NxButton, NxInput, NxModal, NxSelect } from '@/ui'

import type { PseChargeInput } from '../composables/useDirectCheckout'
import { formatColombianPhone, isValidColombianMobile, stripToDigits } from '../support/colombianPhone'

defineProps<{
  modelValue: boolean
  paying: boolean
  error: string | null
  institutions: PseFinancialInstitution[]
  loadingInstitutions: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: PseChargeInput]
}>()

const bankCode = ref<string | null>(null)
const legalIdType = ref('CC')
const legalId = ref('')
const fullName = ref('')
const phoneNumber = ref('')
const phoneTouched = ref(false)

const legalIdTypeOptions = [
  { label: 'Cédula de ciudadanía', value: 'CC' },
  { label: 'NIT', value: 'NIT' },
  { label: 'Cédula de extranjería', value: 'CE' },
]

const phoneFormatted = computed(() => formatColombianPhone(phoneNumber.value))
const phoneValid = computed(() => isValidColombianMobile(phoneNumber.value))
const phoneError = computed(() => (phoneTouched.value && phoneNumber.value.length === 10 && !phoneValid.value ? 'Debe ser un celular colombiano (empieza en 3).' : undefined))

function onPhoneInput(raw: string): void {
  phoneTouched.value = true
  phoneNumber.value = stripToDigits(raw)
}

function onLegalIdInput(raw: string): void {
  // NIT/CC/CE colombianos son numericos en la practica - el digito de
  // verificacion del NIT tambien es numerico, asi que aplica igual.
  legalId.value = raw.replace(/\D/g, '').slice(0, 15)
}

const canSubmit = computed(
  () => Boolean(bankCode.value) && fullName.value.trim().length >= 3 && legalId.value.length >= 5 && phoneValid.value,
)

function submit(): void {
  if (!canSubmit.value || !bankCode.value) {
    return
  }
  emit('submit', {
    financial_institution_code: bankCode.value,
    user_type: 0,
    user_legal_id_type: legalIdType.value,
    user_legal_id: legalId.value,
    customer_full_name: fullName.value.trim(),
    customer_phone_number: phoneNumber.value,
  })
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Pagar con PSE" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p class="text-xs text-slate-500">Vas a terminar el pago en el sitio de tu banco.</p>
      <NxSelect
        v-model="bankCode"
        :options="institutions"
        option-label="name"
        option-value="code"
        label="Banco"
        required
        filter
        :disabled="loadingInstitutions"
      />
      <NxInput v-model="fullName" label="Nombre completo" required />
      <div class="grid grid-cols-2 gap-3">
        <NxSelect v-model="legalIdType" :options="legalIdTypeOptions" option-label="label" option-value="value" label="Tipo de documento" />
        <NxInput
          :model-value="legalId"
          label="Número de documento"
          required
          inputmode="numeric"
          @update:model-value="onLegalIdInput"
        />
      </div>
      <NxInput
        :model-value="phoneFormatted"
        label="Celular"
        required
        placeholder="310 765 4321"
        inputmode="numeric"
        autocomplete="tel-national"
        :error="phoneError"
        @update:model-value="onPhoneInput"
      />
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" :disabled="paying" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-[2]" :loading="paying" :disabled="!canSubmit" @click="submit">Ir a mi banco</NxButton>
      </div>
    </template>
  </NxModal>
</template>
