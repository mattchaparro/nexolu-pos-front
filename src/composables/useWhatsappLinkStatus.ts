import { useQuery } from '@tanstack/vue-query'

import { fetchWhatsappLinkStatus } from '@/services/aiChannelLink'

export function useWhatsappLinkStatus() {
  return useQuery({
    queryKey: ['ai-channel-link', 'whatsapp', 'status'],
    queryFn: fetchWhatsappLinkStatus,
  })
}
