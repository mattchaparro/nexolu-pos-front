import { ref } from 'vue'

import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { confirmAiDraft, discardAiDraft } from '../services/aiDraftService'

/** Confirmar/descartar un borrador de escritura pendiente de un chat de IA. */
export function useAiDraftActions(onResolved: (draftId: string) => void) {
  const confirmingId = ref<string | null>(null)
  const discardingId = ref<string | null>(null)
  const error = ref<string | null>(null)

  async function confirm(draftId: string, values?: Record<string, unknown>): Promise<void> {
    confirmingId.value = draftId
    error.value = null
    try {
      await confirmAiDraft(draftId, values)
      onResolved(draftId)
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos confirmar el borrador.')
    } finally {
      confirmingId.value = null
    }
  }

  async function discard(draftId: string): Promise<void> {
    discardingId.value = draftId
    error.value = null
    try {
      await discardAiDraft(draftId)
      onResolved(draftId)
    } catch (e) {
      error.value = extractErrorMessage(e, 'No pudimos descartar el borrador.')
    } finally {
      discardingId.value = null
    }
  }

  return { confirmingId, discardingId, error, confirm, discard }
}
