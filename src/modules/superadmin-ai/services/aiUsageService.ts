import { httpClient } from '@/services/http/client'
import type { AiUsageResponse } from '@/types/aiUsage'

export async function fetchAiUsage(includeReviewed: boolean): Promise<AiUsageResponse> {
  const { data } = await httpClient.get<AiUsageResponse>('/superadmin/ai/usage', {
    params: includeReviewed ? { include_reviewed: 1 } : undefined,
  })
  return data
}

export async function markQuestionReviewed(questionId: number): Promise<void> {
  await httpClient.patch(`/superadmin/ai/unanswered/${questionId}/reviewed`)
}
