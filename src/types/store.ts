/**
 * Configuracion de la tienda online de un negocio, del lado del comerciante.
 * El catalogo publico que ve el comprador tiene sus propios tipos y vive en
 * el repo del storefront.
 */
export interface TrustItem {
  icon: string
  title: string
  text?: string | null
}

export interface StoryStat {
  value: string
  label: string
}

/** Ranuras de imagen de la tienda. Fijas: cada una tiene su sitio. */
export type StoreImageSlot = 'logo' | 'banner' | 'hero' | 'story'

export interface StoreSettings {
  is_active: boolean
  store_name: string | null
  description: string | null
  logo_url: string | null
  banner_url: string | null
  primary_color: string | null
  surface_color: string | null
  accent_color: string | null
  font_preset: string
  whatsapp_number: string | null
  shipping_flat_fee: number
  min_order_amount: number
  pickup_enabled: boolean
  order_email_enabled: boolean
  /** Vacio = al correo del dueño. */
  order_email: string | null
  terms: string | null
  seo_title: string | null
  seo_description: string | null

  hero_enabled: boolean
  hero_eyebrow: string | null
  hero_title: string | null
  hero_highlight: string | null
  hero_subtitle: string | null
  hero_cta_label: string | null
  hero_image_url: string | null

  trust_enabled: boolean
  trust_items: TrustItem[]

  story_enabled: boolean
  story_eyebrow: string | null
  story_title: string | null
  story_body: string | null
  story_image_url: string | null
  story_stats: StoryStat[]

  address: string | null
  opening_hours: string | null
  instagram_url: string | null
  facebook_url: string | null
  /** Direccion publica ya compuesta ({storefront_url}/{slug}). */
  public_url: string
  /** Publicados Y activos: los que de verdad se ven en la tienda. */
  published_products_count: number
}

export type StoreSettingsPayload = Partial<
  Omit<
    StoreSettings,
    'logo_url' | 'banner_url' | 'hero_image_url' | 'story_image_url' | 'public_url' | 'published_products_count'
  >
>
