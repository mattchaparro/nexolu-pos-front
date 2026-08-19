<script setup lang="ts">
import { computed, ref } from 'vue'

import { NxButton, NxInput, NxModal, NxSwitch } from '@/ui'

import { formatColombianPhone, isValidColombianMobile, stripToDigits } from '../support/colombianPhone'

defineProps<{
  modelValue: boolean
  paying: boolean
  waitingApproval: boolean
  error: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [phoneNumber: string, save: boolean, label: string]
}>()

const phoneNumber = ref('')
const save = ref(true)
const phoneTouched = ref(false)

const phoneFormatted = computed(() => formatColombianPhone(phoneNumber.value))
const phoneValid = computed(() => isValidColombianMobile(phoneNumber.value))
const phoneError = computed(() => (phoneTouched.value && phoneNumber.value.length === 10 && !phoneValid.value ? 'Debe ser un celular colombiano (empieza en 3).' : undefined))

function onPhoneInput(raw: string): void {
  phoneTouched.value = true
  phoneNumber.value = stripToDigits(raw)
}

function submit(): void {
  if (!phoneValid.value) {
    return
  }
  emit('submit', phoneNumber.value, save.value, `Nequi ${phoneNumber.value.slice(0, 3)}•••${phoneNumber.value.slice(-4)}`)
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Pagar con Nequi" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="waitingApproval" class="flex flex-col items-center gap-3 py-6 text-center">
      <i class="pi pi-mobile animate-pulse text-3xl text-indigo-500" />
      <p class="font-semibold text-slate-800">Revisa tu app Nequi</p>
      <p class="text-sm text-slate-500">Tienes que aceptar la suscripción que te llegó por notificación push. Esto solo pasa la primera vez.</p>
    </div>
    <div v-else class="flex flex-col gap-3">
      <NxInput
        :model-value="phoneFormatted"
        label="Celular Nequi"
        required
        placeholder="310 765 4321"
        inputmode="numeric"
        autocomplete="tel-national"
        :error="phoneError"
        @update:model-value="onPhoneInput"
      />
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <NxSwitch v-model="save" />
        Guardar para pagos futuros (sin aprobar de nuevo cada vez)
      </label>
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" :disabled="paying" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-[2]" :loading="paying" :disabled="waitingApproval || !phoneValid" @click="submit">Pagar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
