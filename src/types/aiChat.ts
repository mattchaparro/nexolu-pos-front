export interface AiDraft {
  id: string
  tool_type: string
  status: string
  summary: string
  fields: Record<string, unknown>
  values: Record<string, unknown>
}

export interface AiChatResult {
  conversation_id: string
  text: string
  tools_used: string[]
  drafts: AiDraft[]
}

/** Un evento `data: {...}` del stream SSE de POST /ai/chat/stream. */
export interface AiChatStreamChunk {
  delta?: string | null
  done: boolean
  conversation_id?: string | null
  text?: string | null
  tools_used?: string[]
  drafts?: AiDraft[]
  /** Error en banda (el stream ya abrio con HTTP 200) - ver AiChatController::stream. */
  error?: string
}

/**
 * Un solo agente, con todas las herramientas del POS (ver apps/pos/agents.py
 * en nexolu-ia-core). Antes eran cuatro y el usuario elegia: preguntarle al
 * "cajero" cuanto se vendio en agosto respondia "no tengo esa herramienta",
 * porque ventas_resumen vivia en "analista". Elegir la herramienta es
 * trabajo del modelo.
 */
export type AiAgent = 'asistente'

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  streaming: boolean
  /** El Asistente no pudo responder: la burbuja se pinta como aviso, no como respuesta. */
  failed?: boolean
}
