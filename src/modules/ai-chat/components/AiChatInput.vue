<script setup lang="ts">
import { ref } from 'vue'

import { NxButton, NxTextarea } from '@/ui'

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
  <div class="flex items-end gap-2">
    <div class="flex-1">
      <NxTextarea
        v-model="text"
        placeholder="Escribe tu mensaje..."
        :rows="1"
        :disabled="disabled"
        @keydown="handleKeydown"
      />
    </div>
    <NxButton icon="pi pi-send" :disabled="disabled || !text.trim()" @click="submit">Enviar</NxButton>
  </div>
</template>
