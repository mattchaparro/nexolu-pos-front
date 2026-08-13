import { useQuery } from '@tanstack/vue-query'

import { fetchWhatsAppTemplates } from '../services/whatsappTemplateService'

export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ['superadmin', 'whatsapp-templates'],
    queryFn: fetchWhatsAppTemplates,
  })
}
