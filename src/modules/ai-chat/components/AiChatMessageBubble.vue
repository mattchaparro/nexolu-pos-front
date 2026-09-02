<script setup lang="ts">
import { computed } from 'vue'

import type { AiChatMessage } from '@/types/aiChat'

import { parseRichText } from '../support/richText'

const props = defineProps<{ message: AiChatMessage }>()

// Trozos, no HTML: ver el docblock de richText.ts para por que no se usa una
// libreria de markdown con v-html sobre la salida de un modelo.
const chunks = computed(() => parseRichText(props.message.text))
</script>

<template>
  <div class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
      :class="[
        message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-900',
        // Un fallo se pinta como aviso, no como respuesta del Asistente:
        // sin distinguirlo, el mensaje de error se lee como si la IA
        // hubiera contestado eso.
        message.failed ? 'bg-amber-50 text-amber-800' : '',
      ]"
    >
      <i v-if="message.failed" class="pi pi-exclamation-triangle mr-1.5 text-xs" />
      <template v-if="message.text">
        <template v-for="(chunk, index) in chunks" :key="index">
          <strong v-if="chunk.bold">{{ chunk.text }}</strong>
          <template v-else>{{ chunk.text }}</template>
        </template>
      </template>
      <span v-if="message.streaming" class="ml-1 inline-flex items-center gap-1 align-middle">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.3s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.15s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60" />
      </span>
    </div>
  </div>
</template>
