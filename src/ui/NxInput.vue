<script setup lang="ts">
import { computed, useId } from 'vue'
import PrimeFloatLabel from 'primevue/floatlabel'
import PrimeIconField from 'primevue/iconfield'
import PrimeInputIcon from 'primevue/inputicon'
import PrimeInputText from 'primevue/inputtext'
import PrimeMessage from 'primevue/message'

export type NxInputSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    type?: string
    // Label flotante (Float Label variante "on" de PrimeVue) - estandar
    // para todo campo de un formulario que pide un dato (nombre, telefono,
    // correo, etc.). Sin label queda como placeholder simple, para
    // buscadores/filtros que no son "un formulario" (ver ProductGrid).
    label?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    /** Mensaje de error, se muestra debajo del campo y lo marca invalido. */
    error?: string
    required?: boolean
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
    label: undefined,
    placeholder: undefined,
    disabled: false,
    invalid: false,
    error: undefined,
    required: false,
    size: 'md',
    id: undefined,
    autocomplete: undefined,
    icon: undefined,
    clearable: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)

const showClear = computed(() => props.clearable && Boolean(props.modelValue))
const isInvalid = computed(() => props.invalid || Boolean(props.error))

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

// Con label, el label flotante hace de placeholder (queda centrado hasta
// foco/valor) - pasar los dos a la vez deja el label "flotado" fijo desde
// el arranque (regla CSS :has(input[placeholder]) de FloatLabel).
const effectivePlaceholder = computed(() => (props.label ? undefined : props.placeholder))
</script>

<template>
  <div class="flex flex-col gap-1">
    <PrimeFloatLabel variant="on">
      <PrimeIconField v-if="icon || showClear">
        <PrimeInputIcon v-if="icon" :class="icon" />
        <PrimeInputText
          :id="inputId"
          :model-value="modelValue"
          :type="type"
          :placeholder="effectivePlaceholder"
          :disabled="disabled"
          :invalid="isInvalid"
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
        :id="inputId"
        :model-value="modelValue"
        :type="type"
        :placeholder="effectivePlaceholder"
        :disabled="disabled"
        :invalid="isInvalid"
        :autocomplete="autocomplete"
        :size="primeSize"
        :style="fontSizeStyle"
        fluid
        @update:model-value="(value) => emit('update:modelValue', value as string)"
      />
      <label v-if="label" :for="inputId">{{ label }}<span v-if="required" class="text-red-600"> *</span></label>
    </PrimeFloatLabel>
    <PrimeMessage v-if="error" severity="error" size="small" variant="simple">{{ error }}</PrimeMessage>
  </div>
</template>
