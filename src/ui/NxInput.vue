<script setup lang="ts">
import { computed } from 'vue'
import PrimeIconField from 'primevue/iconfield'
import PrimeInputIcon from 'primevue/inputicon'
import PrimeInputText from 'primevue/inputtext'

export type NxInputSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    type?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    size?: NxInputSize
    id?: string
    autocomplete?: string
    /** PrimeIcon (ej. "pi pi-search") a la izquierda del texto. */
    icon?: string
    /** Muestra una X a la derecha para vaciar el campo cuando tiene texto. */
    clearable?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: undefined,
    disabled: false,
    invalid: false,
    size: 'md',
    id: undefined,
    autocomplete: undefined,
    icon: undefined,
    clearable: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const showClear = computed(() => props.clearable && Boolean(props.modelValue))

// PrimeVue solo tiene "small"/"large" nativos - "md" es su tamaño por
// defecto (undefined).
const primeSize = computed<'small' | 'large' | undefined>(() => {
  if (props.size === 'sm') {
    return 'small'
  }
  if (props.size === 'lg') {
    return 'large'
  }
  return undefined
})

// font-size fijo en 16px pase lo que pase el size: por debajo de eso Safari
// en iOS hace zoom automatico al enfocar el input (ver nota historica en
// git blame), y el tema de Aura si varia el font-size por tamaño.
const fontSizeStyle = { fontSize: '16px' }
</script>

<template>
  <PrimeIconField v-if="icon || showClear">
    <PrimeInputIcon v-if="icon" :class="icon" />
    <PrimeInputText
      :id="id"
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="invalid"
      :autocomplete="autocomplete"
      :size="primeSize"
      :style="fontSizeStyle"
      fluid
      @update:model-value="(value) => emit('update:modelValue', value as string)"
    />
    <PrimeInputIcon
      v-if="showClear"
      class="pi pi-times cursor-pointer"
      role="button"
      aria-label="Limpiar"
      @click="emit('update:modelValue', '')"
    />
  </PrimeIconField>
  <PrimeInputText
    v-else
    :id="id"
    :model-value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :invalid="invalid"
    :autocomplete="autocomplete"
    :size="primeSize"
    :style="fontSizeStyle"
    fluid
    @update:model-value="(value) => emit('update:modelValue', value as string)"
  />
</template>
