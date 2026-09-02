<script setup lang="ts">
// Asistente de IA - chat con streaming contra POST /ai/chat/stream. Primer
// modulo de frontend que consume IA Core (el backend ya lo hacia desde
// hace tiempo, ver docs/BACKEND_READINESS.md en nexolu-pos-api).
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { AiAgent } from '@/types/aiChat'
import { NxPageHeader, NxSelect } from '@/ui'

import AiChatInput from '../components/AiChatInput.vue'
import AiChatMessageBubble from '../components/AiChatMessageBubble.vue'
import AiDraftCard from '../components/AiDraftCard.vue'
import AiQuotaExhaustedBanner from '../components/AiQuotaExhaustedBanner.vue'
import { useAiChat } from '../composables/useAiChat'
import { useAiDraftActions } from '../composables/useAiDraftActions'

const AGENT_OPTIONS: { label: string; value: AiAgent }[] = [
  { label: 'Cajero', value: 'cajero' },
  { label: 'Analista', value: 'analista' },
  { label: 'Inventario', value: 'inventario' },
  { label: 'Restaurante', value: 'restaurante' },
]

const chat = useAiChat('cajero')
const draftActions = useAiDraftActions((draftId) => chat.removeDraft(draftId))

const isQuotaExhausted = computed(() => chat.error.value?.includes('cupo de mensajes') === true)

const messagesEnd = ref<HTMLElement | null>(null)
watch(
  () => chat.messages.value.length,
  async () => {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  },
)

function handleAgentChange(value: unknown): void {
  chat.switchAgent(value as AiAgent)
}

// Pregunta que llega por la URL (?q=...), con la que las tarjetas de insight
// del Inicio abren el chat ya contextualizado: el chat es la continuacion de
// lo que el dueño estaba mirando, no una pantalla aparte a la que hay que
// acordarse de entrar.
//
// Se limpia la query despues de mandarla para que recargar la pagina no
// vuelva a preguntar lo mismo (y no gaste otro mensaje de la cuota).
const route = useRoute()
const router = useRouter()

onMounted(() => {
  const question = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  if (!question) {
    return
  }

  router.replace({ query: {} })
  chat.sendMessage(question)
})
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div class="flex items-center justify-between gap-4">
      <NxPageHeader title="Asistente de IA" subtitle="Pregúntale por ventas, inventario o caja - o pídele que registre algo." icon="pi pi-comments" />
      <div class="w-48">
        <NxSelect
          :model-value="chat.agent.value"
          :options="AGENT_OPTIONS"
          option-label="label"
          option-value="value"
          label="Agente"
          @update:model-value="handleAgentChange"
        />
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
      <p v-if="chat.messages.value.length === 0" class="my-auto text-center text-sm text-slate-400">
        Escribe un mensaje para empezar.
      </p>

      <AiChatMessageBubble v-for="message in chat.messages.value" :key="message.id" :message="message" />

      <AiDraftCard
        v-for="draft in chat.pendingDrafts.value"
        :key="draft.id"
        :draft="draft"
        :confirming="draftActions.confirmingId.value === draft.id"
        :discarding="draftActions.discardingId.value === draft.id"
        @confirm="(id) => draftActions.confirm(id)"
        @discard="(id) => draftActions.discard(id)"
      />

      <div ref="messagesEnd" />
    </div>

    <AiQuotaExhaustedBanner v-if="isQuotaExhausted" :message="chat.error.value!" />
    <p v-else-if="chat.error.value" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ chat.error.value }}
    </p>
    <p v-if="draftActions.error.value" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ draftActions.error.value }}
    </p>

    <AiChatInput :disabled="chat.isStreaming.value" @send="chat.sendMessage" />
  </div>
</template>
