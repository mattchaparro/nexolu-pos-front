import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { CommunicationChannel } from '@/types/superadmin/communication'

import { fetchCommunications } from '../services/communicationService'

export function useCommunications(channel: Ref<CommunicationChannel | ''>, businessId: Ref<number | null>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['superadmin', 'communications', channel.value, businessId.value, page.value] as const),
    queryFn: () =>
      fetchCommunications({
        channel: channel.value || undefined,
        business_id: businessId.value ?? undefined,
        page: page.value,
      }),
  })
}
