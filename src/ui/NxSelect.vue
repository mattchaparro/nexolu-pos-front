<script setup lang="ts" generic="T extends object">
// Dropdown de opciones con el mismo estandar de Float Label "on" que
// NxInput/NxInputNumber - reemplaza cualquier <select> HTML suelto (ver
// README "Nexolu UI"). Para elegir un medio de pago especifico se usa
// PaymentMethodPicker (botones grandes, mejor para pocas opciones tocadas
// seguido); NxSelect es para listas mas largas o secundarias (descuentos,
// filas repetidas).
import { computed, useId } from 'vue'
import PrimeFloatLabel from 'primevue/floatlabel'
import PrimeMessage from 'primevue/message'
import PrimeSelect from 'primevue/select'

import type { NxInputSize } from './NxInput.vue'

const props = withDefaults(
  defineProps<{
    modelValue: unknown
    options: T[]
    optionLabel: string
    optionValue: string
    label?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    error?: string
    required?: boolean
    size?: NxInputSize
    id?: string
  }>(),
  {
    label: undefined,
    placeholder: undefined,
    disabled: false,
    invalid: false,
    error: undefined,
    required: false,
    size: 'md',
    id: undefined,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

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
</script>

<template>
  <div class="flex flex-col gap-1">
    <PrimeFloatLabel variant="on">
      <PrimeSelect
        :input-id="inputId"
        :model-value="modelValue"
        :options="options"
        :option-label="optionLabel"
        :option-value="optionValue"
        :disabled="disabled"
        :invalid="isInvalid"
        :size="primeSize"
        :style="fontSizeStyle"
        fluid
        @update:model-value="(value) => emit('update:modelValue', value)"
      />
      <label v-if="label" :for="inputId">{{ label }}<span v-if="required" class="text-red-600"> *</span></label>
    </PrimeFloatLabel>
    <PrimeMessage v-if="error" severity="error" size="small" variant="simple">{{ error }}</PrimeMessage>
  </div>
</template>
