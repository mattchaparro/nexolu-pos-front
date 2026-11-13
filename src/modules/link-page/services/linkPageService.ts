import { httpClient } from '@/services/http/client'

// La página de enlaces (la de la bio): para todos los negocios, con o sin
// tienda online. El backend crea la fila la primera vez que se consulta.

export interface BioLink {
  label: string
  url: string
}

/** Lo mismo que ve el público en /{slug}/enlaces. */
export interface LinkPagePublic {
  slug: string
  name: string
  description: string | null
  logo_url: string | null
  theme: { primary: string; surface: string; accent: string; font: string }
  has_store: boolean
  has_whatsapp: boolean
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  address: string | null
  opening_hours: string | null
  bio_links: BioLink[]
}

/** Lo editable, tal como se guardó (no la vista resuelta). */
export interface LinkPageSettings {
  name: string | null
  /** El nombre del negocio: lo que sale si `name` va vacío. */
  business_name: string
  description: string | null
  primary_color: string
  surface_color: string
  font_preset: string
  has_logo: boolean
  instagram: string | null
  tiktok: string | null
  whatsapp: string | null
  facebook_url: string | null
}

export type LinkPagePayload = {
  enabled?: boolean
  bio_links?: BioLink[]
  name?: string | null
  description?: string | null
  primary_color?: string
  surface_color?: string
  font_preset?: string
  instagram?: string | null
  tiktok?: string | null
  whatsapp?: string | null
  facebook_url?: string | null
}

export interface LinkPageState {
  /** El comerciante la activó. */
  enabled: boolean
  /** Visible en internet: activada, o con la tienda online abierta. */
  published: boolean
  has_store: boolean
  public_url: string
  page: LinkPagePublic
  settings: LinkPageSettings
}

export async function fetchLinkPage(): Promise<LinkPageState> {
  const { data } = await httpClient.get<LinkPageState>('/link-page')
  return data
}

export async function updateLinkPage(payload: LinkPagePayload): Promise<LinkPageState> {
  const { data } = await httpClient.put<LinkPageState>('/link-page', payload)
  return data
}

/** El logo es el mismo del negocio en la tienda: una sola ranura. */
export async function uploadLinkPageLogo(file: File): Promise<LinkPageState> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await httpClient.post<LinkPageState>('/link-page/logo', form)
  return data
}

export async function deleteLinkPageLogo(): Promise<LinkPageState> {
  const { data } = await httpClient.delete<LinkPageState>('/link-page/logo')
  return data
}
