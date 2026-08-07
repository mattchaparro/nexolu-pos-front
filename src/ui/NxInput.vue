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
  },
)

defineEmits<{ 'update:modelValue': [value: string] }>()

const sizeClasses: Record<NxInputSize, string> = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-3.5 text-base',
}

const rootClass = computed(() => [
  'w-full rounded-lg border bg-white text-slate-900 placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
  'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
  props.invalid ? 'border-red-500' : 'border-slate-300',
  sizeClasses[props.size],
])
</script>

<template>
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
</template>
