<script setup lang="ts">
import type { AiChatMessage } from '@/types/aiChat'

defineProps<{ message: AiChatMessage }>()
</script>

<template>
  <div class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
    <div
      class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
      :class="
        message.role === 'user'
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 text-slate-900'
      "
    >
      <span v-if="message.text">{{ message.text }}</span>
      <span v-if="message.streaming" class="ml-1 inline-flex items-center gap-1 align-middle">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.3s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:-0.15s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60" />
      </span>
    </div>
  </div>
</template>
