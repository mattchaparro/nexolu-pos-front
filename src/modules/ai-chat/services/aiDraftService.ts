import { httpClient } from '@/services/http/client'

// Shape de la respuesta depende de que tool ejecuto IA Core - no vale la
// pena tipar cada capability aca (ver AiDraftController::confirm/discard).
export async function confirmAiDraft(draftId: string, values?: Record<string, unknown>): Promise<unknown> {
  const { data } = await httpClient.post(`/ai/drafts/${draftId}/confirm`, values ? { values } : {})
  return data
}

export async function discardAiDraft(draftId: string): Promise<unknown> {
  const { data } = await httpClient.post(`/ai/drafts/${draftId}/discard`, {})
  return data
}
