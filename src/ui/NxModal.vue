<script setup lang="ts">
// Dialogo modal generico de Nexolu UI (PrimeVue Dialog en modo unstyled,
// estilo 100% Tailwind via `pt`) - primer consumidor es el checkout de
// Vender, pero es intencionalmente generico para que cualquier modulo
// futuro (confirmar eliminar, formularios, etc.) lo reuse en vez de
// armar su propio modal.
import PrimeDialog from 'primevue/dialog'

withDefaults(
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
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}
</script>

<template>
  <PrimeDialog
    :visible="modelValue"
    :modal="true"
    :draggable="false"
    :closable="closable"
    :dismissable-mask="closable"
    :close-on-escape="closable"
    :pt="{
      mask: 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4',
      root: `flex w-full ${sizeClasses[size]} max-h-[90vh] flex-col rounded-xl bg-white shadow-xl`,
      header: 'flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4',
      title: 'text-base font-semibold text-slate-900',
      headerActions: 'flex items-center',
      pcCloseButton:
        'rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600',
      content: 'flex-1 overflow-y-auto p-5',
      footer: 'border-t border-slate-200 px-5 py-4',
    }"
    @update:visible="(value: boolean) => $emit('update:modelValue', value)"
  >
    <template v-if="title" #header>
      <span class="text-base font-semibold text-slate-900">{{ title }}</span>
    </template>
    <template #closeicon>
      <i class="pi pi-times" />
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </PrimeDialog>
</template>
