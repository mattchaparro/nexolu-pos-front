<script setup lang="ts">
// Asistente de IA - chat con streaming contra POST /ai/chat/stream. Primer
// modulo de frontend que consume IA Core (el backend ya lo hacia desde
// hace tiempo, ver docs/BACKEND_READINESS.md en nexolu-pos-api).
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { NxPageHeader } from '@/ui'

import AiChatInput from '../components/AiChatInput.vue'
import AiChatMessageBubble from '../components/AiChatMessageBubble.vue'
import AiChatSuggestions from '../components/AiChatSuggestions.vue'
import AiDraftCard from '../components/AiDraftCard.vue'
import AiQuotaExhaustedBanner from '../components/AiQuotaExhaustedBanner.vue'
import { useAiChat } from '../composables/useAiChat'
import { useAiDraftActions } from '../composables/useAiDraftActions'
import { AI_SUGGESTIONS, type AiSuggestion } from '../support/suggestions'
import { useBusiness } from '@/composables/useBusiness'
import { usePermissions } from '@/composables/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import { hasFeature } from '@/utils/hasFeature'

const chat = useAiChat()
const draftActions = useAiDraftActions((draftId) => chat.removeDraft(draftId))

// Solo las preguntas que este negocio y esta persona pueden hacer: sin el
// modulo o el permiso, el asistente contestaria que no tiene acceso.
const { data: business } = useBusiness()
const { hasPermission } = usePermissions()
const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)

const suggestions = computed(() =>
  AI_SUGGESTIONS.filter(
    (s) =>
      (isAdmin.value || hasPermission(s.permission)) &&
      (!s.feature || hasFeature(business.value, s.feature)),
  ),
)

// Ya en conversacion: una fila corta con las que todavia no se preguntaron.
const askedTexts = computed(() => new Set(chat.messages.value.filter((m) => m.role === 'user').map((m) => m.text)))
const followUps = computed(() => suggestions.value.filter((s) => !askedTexts.value.has(s.text)).slice(0, 6))

const input = ref<InstanceType<typeof AiChatInput> | null>(null)

function pickSuggestion(suggestion: AiSuggestion): void {
  if (suggestion.mode === 'draft') {
    void input.value?.fill(suggestion.text)
    return
  }
  void chat.sendMessage(suggestion.text)
}

const isQuotaExhausted = computed(() => chat.error.value?.includes('cupo de mensajes') === true)

const messagesEnd = ref<HTMLElement | null>(null)
watch(
  () => chat.messages.value.length,
  async () => {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  },
)

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
    <!-- Sin selector de agente: el Asistente tiene todas las herramientas y
         elige la que aplica. Antes habia cuatro y el usuario tenia que
         adivinar cual servia para su pregunta. -->
    <NxPageHeader title="Asistente de IA" subtitle="Pregúntale por ganancias, ventas, inventario o clientes - o pídele que registre algo." icon="pi pi-comments" />

    <div class="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
      <AiChatSuggestions
        v-if="chat.messages.value.length === 0"
        class="my-auto"
        variant="full"
        :suggestions="suggestions"
        :disabled="chat.isStreaming.value"
        @pick="pickSuggestion"
      />

      <AiChatMessageBubble v-for="message in chat.messages.value" :key="message.id" :message="message" />

      <AiDraftCard
        v-for="draft in chat.pendingDrafts.value"
        :key="draft.id"
        :draft="draft"
        :confirming="draftActions.confirmingId.value === draft.id"
        :discarding="draftActions.discardingId.value === draft.id"
        @confirm="(id, values) => draftActions.confirm(id, values)"
        @discard="(id) => draftActions.discard(id)"
      />

      <div ref="messagesEnd" />
    </div>

    <AiQuotaExhaustedBanner v-if="isQuotaExhausted" :message="chat.error.value!" />
    <!-- El error generico ya no lleva banner: se responde dentro del chat
         (ver useAiChat.onError). El de cupo si lo conserva porque trae su
         propia llamada a la accion, que en una burbuja se perderia. -->
    <p v-if="draftActions.error.value" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ draftActions.error.value }}
    </p>

    <AiChatSuggestions
      v-if="chat.messages.value.length > 0 && !chat.isStreaming.value && followUps.length > 0"
      variant="compact"
      :suggestions="followUps"
      @pick="pickSuggestion"
    />
    <AiChatInput ref="input" :disabled="chat.isStreaming.value" @send="chat.sendMessage" />
  </div>
</template>
