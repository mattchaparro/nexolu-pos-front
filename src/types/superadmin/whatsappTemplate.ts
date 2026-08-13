// Refleja SuperAdmin\WhatsAppTemplateController::index (nexolu-pos-api) -
// solo lectura de config/services.php (services.whatsapp.templates/.flows),
// unica fuente de verdad.
export type WhatsAppTemplateStatus = 'configured' | 'pending'

export interface WhatsAppTemplateEntry {
  key: string
  name: string | null
  lang: string | null
  description: string | null
  triggered_by: string | null
  status: WhatsAppTemplateStatus
}

export interface WhatsAppFlowEntry {
  key: string
  id: string | null
  screen: string | null
  description: string | null
  triggered_by: string | null
  status: WhatsAppTemplateStatus
}

export interface WhatsAppTemplatesResponse {
  templates: WhatsAppTemplateEntry[]
  flows: WhatsAppFlowEntry[]
}
