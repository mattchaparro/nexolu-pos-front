<script setup lang="ts">
import { computed, ref } from 'vue'

import { useUpdateBillingProfile } from '@/composables/useBillingProfile'
import type { PseFinancialInstitution } from '@/types/paymentSource'
import { NxButton, NxModal, NxSelect } from '@/ui'

import BillingDetailsFields from './BillingDetailsFields.vue'
import type { PseChargeInput } from '../composables/useDirectCheckout'

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

// Documento/nombre/telefono via el mismo componente compartido que
// AddCardModal (prefill + resumen si ya se completo antes) - PSE los
// necesita como parte del cobro en si, no solo para guardarlos.
const documentType = ref<'CC' | 'NIT' | 'CE'>('CC')
const documentNumber = ref('')
const fullName = ref('')
const phoneNumber = ref('')
const billingEmail = ref('')
const billingAddress = ref('')
const billingCity = ref('')
const billingValid = ref(false)
const updateBillingProfileMutation = useUpdateBillingProfile()

const canSubmit = computed(() => Boolean(bankCode.value) && billingValid.value)

function submit(): void {
  if (!canSubmit.value || !bankCode.value) {
    return
  }
  // Se guarda para la proxima vez - sin esperar la respuesta ni bloquear
  // el pago si falla, es solo comodidad, no un requisito del cobro.
  updateBillingProfileMutation.mutate({
    document_type: documentType.value,
    document_number: documentNumber.value,
    full_name: fullName.value.trim(),
    phone: phoneNumber.value,
    email: billingEmail.value || undefined,
    address: billingAddress.value || undefined,
    city: billingCity.value || undefined,
  })
  emit('submit', {
    financial_institution_code: bankCode.value,
    user_type: 0,
    user_legal_id_type: documentType.value,
    user_legal_id: documentNumber.value,
    customer_full_name: fullName.value.trim(),
    customer_phone_number: phoneNumber.value,
  })
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Pagar con PSE" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p class="text-xs text-slate-500">Vas a terminar el pago en el sitio de tu banco.</p>

      <BillingDetailsFields
        v-model:document-type="documentType"
        v-model:document-number="documentNumber"
        v-model:full-name="fullName"
        v-model:phone="phoneNumber"
        v-model:email="billingEmail"
        v-model:address="billingAddress"
        v-model:city="billingCity"
        v-model:valid="billingValid"
      />

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
