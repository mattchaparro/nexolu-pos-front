import { computed, ref, type Ref } from 'vue'

import type { Block } from '@/packages/block-editor'
import type { StoreSettings, StoreSettingsPayload } from '@/types/store'

/**
 * Todo lo que el editor puede cambiar, en un solo sitio.
 *
 * Antes el editor solo manejaba bloques, colores y tipografía; el resto de
 * los ajustes (nombre, WhatsApp, envío, SEO…) vivía en otra pantalla, así
 * que armar una tienda obligaba a salir del editor y volver. Con esto el
 * editor es de verdad el único lugar donde se construye la tienda.
 *
 * Está aparte de la vista porque son ~18 campos: dentro del componente el
 * `<script setup>` se volvía ilegible, y el historial de deshacer necesita
 * poder serializar el borrador ENTERO sin ir campo por campo.
 */
export interface StoreDraft {
  blocks: Block[]
  primary: string
  surface: string
  accent: string
  font: string
  storeName: string
  description: string
  whatsappNumber: string
  address: string
  openingHours: string
  instagramUrl: string
  facebookUrl: string
  shippingFlatFee: number
  minOrderAmount: number
  pickupEnabled: boolean
  terms: string
  seoTitle: string
  seoDescription: string
}

export function useStoreDraft() {
  const blocks = ref<Block[]>([])
  const primary = ref('#4f46e5')
  const surface = ref('#ffffff')
  const accent = ref('#0ea5e9')
  const font = ref('moderna')

  const storeName = ref('')
  const description = ref('')
  const whatsappNumber = ref('')
  const address = ref('')
  const openingHours = ref('')
  const instagramUrl = ref('')
  const facebookUrl = ref('')

  const shippingFlatFee = ref(0)
  const minOrderAmount = ref(0)
  const pickupEnabled = ref(false)
  const terms = ref('')

  const seoTitle = ref('')
  const seoDescription = ref('')

  /** El borrador como dato plano: es la unidad del historial. */
  function snapshot(): StoreDraft {
    return {
      blocks: blocks.value,
      primary: primary.value,
      surface: surface.value,
      accent: accent.value,
      font: font.value,
      storeName: storeName.value,
      description: description.value,
      whatsappNumber: whatsappNumber.value,
      address: address.value,
      openingHours: openingHours.value,
      instagramUrl: instagramUrl.value,
      facebookUrl: facebookUrl.value,
      shippingFlatFee: shippingFlatFee.value,
      minOrderAmount: minOrderAmount.value,
      pickupEnabled: pickupEnabled.value,
      terms: terms.value,
      seoTitle: seoTitle.value,
      seoDescription: seoDescription.value,
    }
  }

  function restore(state: StoreDraft): void {
    blocks.value = state.blocks
    primary.value = state.primary
    surface.value = state.surface
    accent.value = state.accent
    font.value = state.font
    storeName.value = state.storeName
    description.value = state.description
    whatsappNumber.value = state.whatsappNumber
    address.value = state.address
    openingHours.value = state.openingHours
    instagramUrl.value = state.instagramUrl
    facebookUrl.value = state.facebookUrl
    shippingFlatFee.value = state.shippingFlatFee
    minOrderAmount.value = state.minOrderAmount
    pickupEnabled.value = state.pickupEnabled
    terms.value = state.terms
    seoTitle.value = state.seoTitle
    seoDescription.value = state.seoDescription
  }

  /** Carga lo guardado. Los nulos se vuelven '' para que los inputs no fallen. */
  function loadFrom(settings: StoreSettings): void {
    blocks.value = (settings.home_blocks ?? []).map((block) => ({ ...block })) as Block[]
    primary.value = settings.primary_color ?? '#4f46e5'
    surface.value = settings.surface_color ?? '#ffffff'
    accent.value = settings.accent_color ?? '#0ea5e9'
    font.value = settings.font_preset ?? 'moderna'
    storeName.value = settings.store_name ?? ''
    description.value = settings.description ?? ''
    whatsappNumber.value = settings.whatsapp_number ?? ''
    address.value = settings.address ?? ''
    openingHours.value = settings.opening_hours ?? ''
    instagramUrl.value = settings.instagram_url ?? ''
    facebookUrl.value = settings.facebook_url ?? ''
    shippingFlatFee.value = Number(settings.shipping_flat_fee ?? 0)
    minOrderAmount.value = Number(settings.min_order_amount ?? 0)
    pickupEnabled.value = Boolean(settings.pickup_enabled)
    terms.value = settings.terms ?? ''
    seoTitle.value = settings.seo_title ?? ''
    seoDescription.value = settings.seo_description ?? ''
  }

  /**
   * Lo que se manda a guardar. Los textos vacíos van como `null` y no como
   * '': la API los guarda tal cual, y un `seo_title` de cadena vacía no es lo
   * mismo que "sin título propio" — con '' la tienda publicaría un `<title>`
   * en blanco en vez de caer al nombre del negocio.
   */
  function toPayload(): StoreSettingsPayload {
    const opcional = (value: string) => (value.trim() === '' ? null : value.trim())

    return {
      home_blocks: blocks.value,
      primary_color: primary.value,
      surface_color: surface.value,
      accent_color: accent.value,
      font_preset: font.value,
      store_name: opcional(storeName.value),
      description: opcional(description.value),
      whatsapp_number: opcional(whatsappNumber.value),
      address: opcional(address.value),
      opening_hours: opcional(openingHours.value),
      instagram_url: opcional(instagramUrl.value),
      facebook_url: opcional(facebookUrl.value),
      shipping_flat_fee: shippingFlatFee.value,
      min_order_amount: minOrderAmount.value,
      pickup_enabled: pickupEnabled.value,
      terms: opcional(terms.value),
      seo_title: opcional(seoTitle.value),
      seo_description: opcional(seoDescription.value),
    }
  }

  /**
   * Lo que ve la vista previa: lo guardado con el borrador encima. Se calcula
   * acá para que la vista no tenga que volver a listar los 18 campos.
   */
  function previewSettings(saved: Ref<StoreSettings | undefined>) {
    return computed(() => ({
      ...(saved.value as StoreSettings),
      primary_color: primary.value,
      surface_color: surface.value,
      accent_color: accent.value,
      font_preset: font.value,
      store_name: storeName.value,
      description: description.value,
      whatsapp_number: whatsappNumber.value,
      min_order_amount: minOrderAmount.value,
      shipping_flat_fee: shippingFlatFee.value,
    }))
  }

  return {
    blocks,
    primary,
    surface,
    accent,
    font,
    storeName,
    description,
    whatsappNumber,
    address,
    openingHours,
    instagramUrl,
    facebookUrl,
    shippingFlatFee,
    minOrderAmount,
    pickupEnabled,
    terms,
    seoTitle,
    seoDescription,
    snapshot,
    restore,
    loadFrom,
    toPayload,
    previewSettings,
  }
}
