import { httpClient } from '@/services/http/client'
import { tokenStorage } from '@/services/http/tokenStorage'
import type { AiAgent, AiChatResult, AiChatStreamChunk } from '@/types/aiChat'

export interface AiChatPayload {
  agent: AiAgent
  message: string
  conversation_id: string | null
}

/** Fallback no-streaming - POST /ai/chat, ya existe en el backend hoy. */
export async function sendAiChatMessage(payload: AiChatPayload): Promise<AiChatResult> {
  const { data } = await httpClient.post<AiChatResult>('/ai/chat', payload)
  return data
}

export interface AiChatStreamHandlers {
  onDelta: (delta: string) => void
  onDone: (final: AiChatResult) => void
  onError: (message: string) => void
}

/**
 * Cliente SSE a mano con fetch()/ReadableStream para POST /ai/chat/stream.
 * No se puede usar EventSource (GET-only, sin headers custom - no puede
 * llevar el body JSON ni el Bearer token) ni el httpClient de axios (sin
 * lectura incremental de stream en el navegador) - por eso esta es la unica
 * llamada de todo el modulo que no pasa por httpClient, aunque reutiliza el
 * mismo token y la misma base URL para no divergir de como se autentica el
 * resto de la app.
 *
 * AiChatController::stream devuelve JSON normal (403/502/422) para
 * cualquier fallo de gating ANTES de abrir el stream, y text/event-stream
 * en exito - por eso el primer chequeo es sobre el content-type/status, no
 * sobre el body.
 */
export async function streamAiChatMessage(
  payload: AiChatPayload,
  handlers: AiChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = tokenStorage.get()
  let response: Response

  try {
    response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    })
  } catch {
    handlers.onError('No pudimos conectar con el Asistente de IA.')
    return
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('text/event-stream')) {
    const data = await response.json().catch(() => null)
    handlers.onError(data?.error ?? data?.message ?? 'El Asistente de IA no pudo procesar el mensaje.')
    return
  }
  if (!response.body) {
    handlers.onError('Tu navegador no soporta respuestas en streaming.')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })

      let separatorIndex: number
      while ((separatorIndex = buffer.indexOf('\n\n')) >= 0) {
        const rawEvent = buffer.slice(0, separatorIndex).trim()
        buffer = buffer.slice(separatorIndex + 2)
        const jsonPart = rawEvent.startsWith('data:') ? rawEvent.slice(5).trim() : rawEvent
        if (!jsonPart) {
          continue
        }

        let chunk: AiChatStreamChunk
        try {
          chunk = JSON.parse(jsonPart)
        } catch {
          continue
        }

        if (chunk.error) {
          handlers.onError(chunk.error)
          return
        }
        if (chunk.delta) {
          handlers.onDelta(chunk.delta)
        }
        if (chunk.done) {
          handlers.onDone({
            conversation_id: chunk.conversation_id ?? '',
            text: chunk.text ?? '',
            tools_used: chunk.tools_used ?? [],
            drafts: chunk.drafts ?? [],
          })
          return
        }
      }
    }
    // El reader termino sin haber visto un evento done:true -> se corto la conexion.
    handlers.onError('Se perdió la conexión con el Asistente de IA. Intenta de nuevo.')
  } catch (e) {
    // AbortError = el usuario cancelo a proposito (ver useAiChat.cancel()); no es un error que mostrar.
    if ((e as Error).name !== 'AbortError') {
      handlers.onError('Se perdió la conexión con el Asistente de IA. Intenta de nuevo.')
    }
  }
}
