import { ref } from 'vue'

import { streamAiChatMessage } from '../services/aiChatService'
import type { AiAgent, AiChatMessage, AiDraft } from '@/types/aiChat'

/**
 * Estado de una conversacion con el Asistente de IA. Vive como refs locales,
 * no Pinia ni TanStack Query - es un stream en vivo, no estado de servidor
 * cacheable (mismo criterio que useAiMessagePackCheckout).
 */
export function useAiChat(initialAgent: AiAgent = 'asistente') {
  const agent = ref<AiAgent>(initialAgent)
  const messages = ref<AiChatMessage[]>([])
  const conversationId = ref<string | null>(null)
  const pendingDrafts = ref<AiDraft[]>([])
  const isStreaming = ref(false)
  const error = ref<string | null>(null)

  let controller: AbortController | null = null

  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed || isStreaming.value) {
      return
    }

    error.value = null
    messages.value.push({ id: crypto.randomUUID(), role: 'user', text: trimmed, streaming: false })
    messages.value.push({ id: crypto.randomUUID(), role: 'assistant', text: '', streaming: true })

    // Se relee desde el array en vez de usar la referencia que se empujo:
    // push() guarda el objeto CRUDO y las lecturas devuelven un proxy, asi
    // que mutar la referencia local no notifica a Vue. Los deltas llegaban
    // y el texto se actualizaba en memoria, pero la pantalla no se
    // repintaba nunca - se quedaba con los tres puntos para siempre aunque
    // la respuesta ya estuviera completa.
    const assistantMessage = messages.value[messages.value.length - 1] as AiChatMessage

    isStreaming.value = true
    controller = new AbortController()

    await streamAiChatMessage(
      { agent: agent.value, message: trimmed, conversation_id: conversationId.value },
      {
        onDelta: (delta) => {
          assistantMessage.text += delta
        },
        onDone: (final) => {
          // El texto final puede venir vacio si el modelo solo ejecuto
          // herramientas; en ese caso se conserva lo que ya se fue pintando.
          assistantMessage.text = final.text || assistantMessage.text
          assistantMessage.streaming = false
          conversationId.value = final.conversation_id
          pendingDrafts.value.push(...final.drafts)
          isStreaming.value = false
        },
        onError: (message) => {
          assistantMessage.streaming = false
          // El error se responde DENTRO del chat, no solo en un banner
          // aparte: una burbuja vacia con los puntos quietos se lee como
          // "sigue pensando" y el usuario se queda esperando algo que ya
          // no va a llegar.
          if (!assistantMessage.text) {
            // El motivo real del servidor cuando lo hay ("Tu plan vencio...",
            // "No pudimos conectar..."), que es mucho mas util que un texto
            // generico; el generico queda como respaldo.
            assistantMessage.text = message || 'Tuve un inconveniente para responder. Intenta de nuevo en un momento.'
            assistantMessage.failed = true
          }
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

  return { agent, messages, conversationId, pendingDrafts, isStreaming, error, sendMessage, cancel, removeDraft }
}
