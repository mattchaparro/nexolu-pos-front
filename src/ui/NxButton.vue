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
// El color en si (indigo, slate, rojo) lo pone el tema de PrimeVue
// (theme/nexoluPreset.ts) via severity - no Tailwind a mano.
const severity = computed<'primary' | 'secondary' | 'danger'>(() => {
  if (props.variant === 'danger') {
    return 'danger'
  }
  if (props.variant === 'primary') {
    return 'primary'
  }
  return 'secondary'
})

const outlined = computed(() => props.variant === 'outline')
const text = computed(() => props.variant === 'ghost')

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
</script>

<template>
  <!--
    Icon prop y el slot de loading nativos de PrimeButton no se usan: su
    fallback (icono/spinner) solo se renderiza cuando el slot default esta
    vacio, y NxButton siempre lo llena con el texto del boton. Pasarle
    :icon ademas rompe el tamaño (PrimeVue marca "icon-only" con solo
    chequear la prop icon + la prop label, sin mirar el slot - ver
    node_modules/primevue/button/index.mjs hasIcon/icon-only), asi que el
    icono y el spinner se pintan a mano aca en vez de delegarselos.
  -->
  <PrimeButton
    :severity="severity"
    :outlined="outlined"
    :text="text"
    :size="primeSize"
    :loading="loading"
    :disabled="disabled || loading"
    :type="type"
  >
    <i v-if="loading" class="pi pi-spinner pi-spin" aria-hidden="true" />
    <i v-else-if="icon" :class="icon" aria-hidden="true" />
    <slot />
  </PrimeButton>
</template>
