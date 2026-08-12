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

<style scoped>
/* PrimeVue le pone autofocus al boton de cerrar cuando el modal no tiene
   ningun otro elemento [autofocus] (ver Dialog.vue: focus() cae al close
   button si no encuentra otro foco). Eso deja el anillo de foco por
   defecto (negro/gris, no viene del tema de Nexolu) visible apenas se
   abre cualquier modal - se ve como un circulo alrededor de la X aunque
   nadie haya tocado nada todavia. Un anillo indigo sutil, consistente con
   el resto del tema, en vez de ocultarlo del todo (rompe accesibilidad
   de teclado).
*/
:deep(.p-dialog-close-button:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 2px var(--p-primary-200);
}
</style>
