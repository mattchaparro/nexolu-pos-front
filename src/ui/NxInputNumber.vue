<script setup lang="ts">
// Version numerica de NxInput: mismo estandar de Float Label "on", pero
// formateada como peso colombiano por defecto (separador de miles,
// entero, igual que formatCop) en vez de un <input type="number"> crudo.
// Cualquier monto (precio, abono, vuelto, etc.) debe pasar por aca, no por
// un input de texto/numero suelto - ver la charla sobre estandarizar
// inputs en Nexolu UI.
import { computed, useId } from 'vue'
import PrimeFloatLabel from 'primevue/floatlabel'
import PrimeInputNumber from 'primevue/inputnumber'
import PrimeMessage from 'primevue/message'

import type { NxInputSize } from './NxInput.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    label?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    error?: string
    required?: boolean
    size?: NxInputSize
    id?: string
    min?: number
    max?: number
    /** false para un numero plano (ej. cantidad) sin el "$" de moneda. */
    currency?: boolean
  }>(),
  {
    modelValue: null,
    label: undefined,
    placeholder: undefined,
    disabled: false,
    invalid: false,
    error: undefined,
    required: false,
    size: 'md',
    id: undefined,
    min: undefined,
    max: undefined,
    currency: true,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)
const isInvalid = computed(() => props.invalid || Boolean(props.error))

const primeSize = computed<'small' | 'large' | undefined>(() => {
  if (props.size === 'sm') {
    return 'small'
  }
  if (props.size === 'lg') {
    return 'large'
  }
  return undefined
})

const fontSizeStyle = { fontSize: '16px' }
const effectivePlaceholder = computed(() => (props.label ? undefined : props.placeholder))
</script>

<template>
  <div class="flex flex-col gap-1">
    <PrimeFloatLabel variant="on">
      <PrimeInputNumber
        :input-id="inputId"
        :model-value="modelValue"
        :placeholder="effectivePlaceholder"
        :disabled="disabled"
        :invalid="isInvalid"
        :size="primeSize"
        :style="fontSizeStyle"
        :min="min"
        :max="max"
        locale="es-CO"
        :mode="currency ? 'currency' : 'decimal'"
        currency="COP"
        :min-fraction-digits="0"
        :max-fraction-digits="0"
        fluid
        @update:model-value="(value) => emit('update:modelValue', (value as number | undefined) ?? null)"
      />
      <label v-if="label" :for="inputId">{{ label }}<span v-if="required" class="text-red-600"> *</span></label>
    </PrimeFloatLabel>
    <PrimeMessage v-if="error" severity="error" size="small" variant="simple">{{ error }}</PrimeMessage>
  </div>
</template>
