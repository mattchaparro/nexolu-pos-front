<script setup lang="ts">
import { computed } from 'vue'
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
  },
)

defineEmits<{ 'update:modelValue': [value: string] }>()

// text-base (16px) en las 3 variantes a proposito: por debajo de 16px,
// Safari en iOS hace zoom automatico al enfocar el input, y no hay forma
// de desactivar ese zoom sin tocar el viewport global (rompe el zoom de
// accesibilidad de toda la app) - asi que el tamaño de fuente del input
// queda fijo en 16px en todos lados, aunque el alto/padding varien.
const sizeClasses: Record<NxInputSize, string> = {
  sm: 'h-8 px-2.5 text-base',
  md: 'h-10 px-3 text-base',
  lg: 'h-12 px-3.5 text-base',
}

const iconLeftClasses: Record<NxInputSize, string> = {
  sm: 'left-2.5 text-sm',
  md: 'left-3 text-base',
  lg: 'left-3.5 text-lg',
}

const iconPaddingClasses: Record<NxInputSize, string> = {
  sm: 'pl-8',
  md: 'pl-9',
  lg: 'pl-11',
}

const rootClass = computed(() => [
  'w-full rounded-lg border bg-white text-slate-900 placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
  'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
  props.invalid ? 'border-red-500' : 'border-slate-300',
  sizeClasses[props.size],
  props.icon ? iconPaddingClasses[props.size] : '',
])
</script>

<template>
  <div class="relative w-full">
    <i
      v-if="icon"
      :class="[
        icon,
        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400',
        iconLeftClasses[size],
      ]"
      aria-hidden="true"
    />
    <PrimeInputText
      :id="id"
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="invalid"
      :autocomplete="autocomplete"
      :class="rootClass"
      @update:model-value="(value) => $emit('update:modelValue', value as string)"
    />
  </div>
</template>
