<script setup lang="ts">
// Dialogo modal generico de Nexolu UI (PrimeVue Dialog con el tema propio,
// ver theme/nexoluPreset.ts) - primer consumidor es el checkout de Vender,
// pero es intencionalmente generico para que cualquier modulo futuro
// (confirmar eliminar, formularios, etc.) lo reuse en vez de armar su
// propio modal. Solo el ancho por tamaño queda en Tailwind (pt.root): el
// resto del look (colores, bordes, sombra) lo pone el tema de PrimeVue.
import PrimeDialog from 'primevue/dialog'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    closable?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    title: undefined,
    closable: true,
    size: 'md',
  },
)

defineEmits<{ 'update:modelValue': [value: boolean] }>()

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-full max-w-sm',
  md: 'w-full max-w-md',
  lg: 'w-full max-w-lg',
}
</script>

<template>
  <PrimeDialog
    :visible="modelValue"
    :header="title"
    :modal="true"
    :draggable="false"
    :closable="closable"
    :dismissable-mask="closable"
    :close-on-escape="closable"
    :pt="{ root: { class: sizeClasses[props.size] } }"
    @update:visible="(value: boolean) => $emit('update:modelValue', value)"
  >
    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </PrimeDialog>
</template>
