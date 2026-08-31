import { ref } from 'vue'

import { streamAiChatMessage } from '../services/aiChatService'
import type { AiAgent, AiChatMessage, AiDraft } from '@/types/aiChat'

/**
 * Estado de una conversacion con el Asistente de IA. Vive como refs locales,
 * no Pinia ni TanStack Query - es un stream en vivo, no estado de servidor
 * cacheable (mismo criterio que useAiMessagePackCheckout).
 */
export function useAiChat(initialAgent: AiAgent = 'cajero') {
  const agent = ref<AiAgent>(initialAgent)
  const messages = ref<AiChatMessage[]>([])
  const conversationId = ref<string | null>(null)
  const pendingDrafts = ref<AiDraft[]>([])
  const isStreaming = ref(false)
  const error = ref<string | null>(null)

  let controller: AbortController | null = null

  /** Cambiar de agente implica conversacion nueva - IA Core resuelve conversacion por (agent, conversation_id). */
  function switchAgent(next: AiAgent): void {
    agent.value = next
    conversationId.value = null
  }

  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || isStreaming.value) {
      return
    }

    error.value = null
    messages.value.push({ id: crypto.randomUUID(), role: 'user', text: trimmed, streaming: false })
    const assistantMessage: AiChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: '', streaming: true }
    messages.value.push(assistantMessage)

    isStreaming.value = true
    controller = new AbortController()

    await streamAiChatMessage(
      { agent: agent.value, message: trimmed, conversation_id: conversationId.value },
      {
        onDelta: (delta) => {
          assistantMessage.text += delta
        },
        onDone: (final) => {
          assistantMessage.text = final.text
          assistantMessage.streaming = false
          conversationId.value = final.conversation_id
          pendingDrafts.value.push(...final.drafts)
          isStreaming.value = false
        },
        onError: (message) => {
          assistantMessage.streaming = false
          error.value = message
          isStreaming.value = false
        },
      },
      controller.signal,
    )
  }

  function cancel(): void {
    controller?.abort()
    isStreaming.value = false
  }

  function removeDraft(draftId: string): void {
    pendingDrafts.value = pendingDrafts.value.filter((draft) => draft.id !== draftId)
  }

  return { agent, messages, conversationId, pendingDrafts, isStreaming, error, sendMessage, switchAgent, cancel, removeDraft }
}
