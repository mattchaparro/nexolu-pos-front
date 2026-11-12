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
  has_store: boolean
  has_whatsapp: boolean
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  address: string | null
  opening_hours: string | null
  bio_links: BioLink[]
}

export interface LinkPageState {
  /** El comerciante la activó. */
  enabled: boolean
  /** Visible en internet: activada, o con la tienda online abierta. */
  published: boolean
  has_store: boolean
  public_url: string
  page: LinkPagePublic
}

export async function fetchLinkPage(): Promise<LinkPageState> {
  const { data } = await httpClient.get<LinkPageState>('/link-page')
  return data
}

export async function updateLinkPage(payload: {
  enabled?: boolean
  bio_links?: BioLink[]
}): Promise<LinkPageState> {
  const { data } = await httpClient.put<LinkPageState>('/link-page', payload)
  return data
}
