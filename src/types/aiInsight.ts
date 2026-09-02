/** Una tarjeta de insight generada por IA. Ver AiInsightController en la API. */
export interface AiInsight {
  type: string
  text: string
  generated_at: string | null
  from_cache: boolean
  /** Pregunta con la que abrir el chat ya contextualizado. */
  suggested_question: string | null
  /** Orden que dispara una herramienta de escritura, si el tipo la ofrece. */
  suggested_action: { label: string; message: string } | null
}
