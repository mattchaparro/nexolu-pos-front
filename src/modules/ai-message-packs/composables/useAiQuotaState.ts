import { useQuery } from '@tanstack/vue-query'

import { fetchAiQuotaState } from '../services/aiMessagePackService'

export function useAiQuotaState() {
  return useQuery({
    queryKey: ['ai-message-packs', 'state'],
    queryFn: fetchAiQuotaState,
  })
}
