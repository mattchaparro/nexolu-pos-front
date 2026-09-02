<script setup lang="ts">
import { ref } from 'vue'

import { NxTextarea } from '@/ui'

const props = defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ send: [text: string] }>()

const text = ref('')

function submit(): void {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) {
    return
  }
  emit('send', trimmed)
  text.value = ''
}

// Enter envia, Shift+Enter agrega un salto de linea - el keydown del
// textarea interno de NxTextarea burbujea hasta este listener via el
// fallthrough de atributos de Vue, no hace falta un slot dedicado.
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <!--
    Boton circular de icono, no un NxButton con la palabra "Enviar": en el
    celular ese boton se comia un tercio del ancho de la fila y empujaba el
    campo de texto, y el usuario ya sabe que el avioncito manda. items-center
    (no items-end) para que quede centrado contra el campo en vez de colgado
    del borde inferior.
  -->
  <div class="flex items-center gap-2">
    <div class="min-w-0 flex-1">
      <NxTextarea
        v-model="text"
        placeholder="Escribe tu mensaje..."
        :rows="1"
        :disabled="disabled"
        @keydown="handleKeydown"
      />
    </div>
    <button
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      :disabled="disabled || !text.trim()"
      aria-label="Enviar mensaje"
      title="Enviar"
      @click="submit"
    >
      <i class="pi pi-send text-sm" />
    </button>
  </div>
</template>
