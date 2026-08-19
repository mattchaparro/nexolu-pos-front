<script setup lang="ts">
// "Pagar" sobre una fuente guardada disparaba el cobro directo, sin pasar
// por datos de facturacion - el unico camino de pago que se los saltaba
// por completo. Ahora confirma primero (con resumen compacto si ya estan
// guardados, asi no molesta en cada cobro repetido).
import type { PaymentSource } from '@/types/paymentSource'
import { NxButton, NxModal } from '@/ui'

import BillingDetailsFields from './BillingDetailsFields.vue'
import { useBillingCheckout } from '../composables/useBillingCheckout'
import { paymentMethodImage } from '../support/paymentMethodImages'

defineProps<{
  modelValue: boolean
  source: PaymentSource | null
  paying: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: []
}>()

const billing = useBillingCheckout()

function submit(): void {
  if (!billing.valid.value) {
    return
  }
  billing.save()
  emit('submit')
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Confirmar pago" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <div v-if="source" class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
        <img :src="paymentMethodImage(source.type)" alt="" class="h-7 w-auto rounded-md" />
        {{ source.label }}
      </div>

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

      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" :disabled="paying" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-[2]" :loading="paying" :disabled="!billing.valid.value" @click="submit">Pagar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
