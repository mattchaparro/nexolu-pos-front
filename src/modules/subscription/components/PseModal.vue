<script setup lang="ts">
import { computed, ref } from 'vue'

import type { PseFinancialInstitution } from '@/types/paymentSource'
import { NxButton, NxModal, NxSelect } from '@/ui'

import BillingDetailsFields from './BillingDetailsFields.vue'
import { useBillingCheckout } from '../composables/useBillingCheckout'
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

// Documento/nombre/telefono via el mismo composable/componente que el
// resto de los medios de pago - PSE los necesita como parte del cobro en
// si, no solo para guardarlos.
const billing = useBillingCheckout()

const canSubmit = computed(() => Boolean(bankCode.value) && billing.valid.value)

function submit(): void {
  if (!canSubmit.value || !bankCode.value) {
    return
  }
  billing.save()
  emit('submit', {
    financial_institution_code: bankCode.value,
    user_type: 0,
    user_legal_id_type: billing.documentType.value,
    user_legal_id: billing.documentNumber.value,
    customer_full_name: billing.fullName.value.trim(),
    customer_phone_number: billing.phone.value,
  })
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Pagar con PSE" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p class="text-xs text-slate-500">Vas a terminar el pago en el sitio de tu banco.</p>

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
