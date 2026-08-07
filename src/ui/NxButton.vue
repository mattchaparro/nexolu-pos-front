<script setup lang="ts">
import { computed } from 'vue'
import PrimeButton from 'primevue/button'

export type NxButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type NxButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: NxButtonVariant
    size?: NxButtonSize
    loading?: boolean
    disabled?: boolean
    icon?: string
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    icon: undefined,
    type: 'button',
  },
)

// Cada variante tiene un unico significado fijo en toda la app - nunca
// elegir color "porque combina" en una pantalla puntual. `danger` es
// exclusivo para acciones destructivas (eliminar, cancelar algo
// irreversible), nunca un color alternativo para "otro boton mas".
const variantClasses: Record<NxButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600 disabled:bg-indigo-300',
  secondary:
    'bg-slate-800 text-white hover:bg-slate-900 focus-visible:outline-slate-800 disabled:bg-slate-300',
  outline:
    'border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:outline-indigo-600 disabled:text-slate-400',
  ghost:
    'text-slate-700 hover:bg-slate-100 focus-visible:outline-indigo-600 disabled:text-slate-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-200',
}

const sizeClasses: Record<NxButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

const rootClass = computed(() => [
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed',
  variantClasses[props.variant],
  sizeClasses[props.size],
])
</script>

<template>
  <PrimeButton :class="rootClass" :disabled="disabled || loading" :type="type">
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
    <i v-else-if="icon" :class="icon" aria-hidden="true" />
    <slot />
  </PrimeButton>
</template>
