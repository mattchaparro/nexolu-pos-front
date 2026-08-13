import { httpClient } from '@/services/http/client'
import type { WhatsAppTemplatesResponse } from '@/types/superadmin/whatsappTemplate'

export async function fetchWhatsAppTemplates(): Promise<WhatsAppTemplatesResponse> {
  const { data } = await httpClient.get<WhatsAppTemplatesResponse>('/superadmin/whatsapp-templates')
  return data
}
