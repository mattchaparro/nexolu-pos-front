<script setup lang="ts">
// Gate de datos de facturacion generico: se antepone a cualquier medio de
// pago que no necesite pedir nada mas propio (Boton Bancolombia, el widget
// de Wompi) - ver BillingDetailsFields.vue para el prefill/resumen. Los
// medios que si tienen campos propios (tarjeta, Nequi, PSE, fuente
// guardada) lo incluyen directo en su propio modal en vez de este.
import { useBillingCheckout } from '../composables/useBillingCheckout'
import { NxButton, NxModal } from '@/ui'

import BillingDetailsFields from './BillingDetailsFields.vue'

withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    confirmLabel?: string
    paying: boolean
    error: string | null
  }>(),
  { description: undefined, confirmLabel: 'Continuar' },
)

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
  <NxModal :model-value="modelValue" :title="title" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p v-if="description" class="text-xs text-slate-500">{{ description }}</p>

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
        <NxButton class="flex-[2]" :loading="paying" :disabled="!billing.valid.value" @click="submit">{{ confirmLabel }}</NxButton>
      </div>
    </template>
  </NxModal>
</template>
