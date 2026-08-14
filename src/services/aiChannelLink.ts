import { httpClient } from '@/services/http/client'

// Vinculo del usuario con su WhatsApp para el Asistente de IA
// (POST /ai/channels/whatsapp/*) - hoy solo lo consume el card de
// onboarding del Dashboard (ver DashboardView.vue), pero no vive adentro de
// ese modulo porque el futuro modulo de Asistente IA (todavia
// `disabled: true` en router/navigation.ts) tambien lo va a necesitar para
// vincular/desvincular desde su propia pantalla.
export interface WhatsappLinkStartResponse {
  ok: boolean
  expires_at?: string
  message: string
}

export interface WhatsappLinkConfirmResponse {
  ok: boolean
  message: string
  partial_number?: string
}

export async function startWhatsappLink(phone: string): Promise<WhatsappLinkStartResponse> {
  const { data } = await httpClient.post<WhatsappLinkStartResponse>('/ai/channels/whatsapp/start', { phone })
  return data
}

export async function confirmWhatsappLink(code: string): Promise<WhatsappLinkConfirmResponse> {
  const { data } = await httpClient.post<WhatsappLinkConfirmResponse>('/ai/channels/whatsapp/confirm', { code })
  return data
}

// Estado real del vinculo, sin las excepciones de
// GET /dashboard/whatsapp-onboarding (que se apaga si el usuario ya
// descarto la tarjeta o el negocio tiene el chat de IA bloqueado - eso solo
// decide si se muestra esa tarjeta, no si el canal esta vinculado). Lo usa
// la pestaña de notificaciones de Ajustes.
export async function fetchWhatsappLinkStatus(): Promise<{ linked: boolean }> {
  const { data } = await httpClient.get<{ linked: boolean }>('/ai/channels/whatsapp/status')
  return data
}
