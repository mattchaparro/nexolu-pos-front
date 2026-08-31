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

export type AiAgent = 'cajero' | 'analista' | 'inventario' | 'restaurante'

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  streaming: boolean
}
