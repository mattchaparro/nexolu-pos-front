import { httpClient } from '@/services/http/client'

export type AnnouncementScope = 'in_use' | 'active' | 'selected'

export interface Announcement {
  id: number
  title: string
  body: string
  cta_label: string | null
  cta_url: string | null
  audience: 'all' | 'admin' | 'employee'
  business_scope: AnnouncementScope
  business_ids: number[] | null
  active: boolean
  seen_count?: number
  whatsapp_requested: boolean
  whatsapp_sent: number
  whatsapp_failed: number
  created_at: string | null
}

export interface AnnouncementPayload {
  title: string
  body: string
  cta_label?: string | null
  cta_url?: string | null
  audience: 'all' | 'admin'
  business_scope: AnnouncementScope
  business_ids?: number[]
  send_whatsapp: boolean
}

export interface AnnouncementAudience {
  businesses: number
  with_whatsapp: number
  names: string[]
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  // Los Resources de esta API van sin envoltura `data` (ver AnnouncementsTest).
  const { data } = await httpClient.get<Announcement[]>('/superadmin/announcements')
  return data
}

export async function createAnnouncement(payload: AnnouncementPayload): Promise<Announcement> {
  const { data } = await httpClient.post<Announcement>('/superadmin/announcements', payload)
  return data
}

export async function setAnnouncementActive(item: Announcement, active: boolean): Promise<void> {
  await httpClient.put(`/superadmin/announcements/${item.id}`, {
    title: item.title,
    body: item.body,
    audience: item.audience,
    active,
  })
}

export async function fetchAnnouncementAudience(scope: AnnouncementScope, businessIds: number[]): Promise<AnnouncementAudience> {
  const { data } = await httpClient.get<AnnouncementAudience>('/superadmin/announcements/audience', {
    params: { business_scope: scope, business_ids: businessIds },
  })
  return data
}
