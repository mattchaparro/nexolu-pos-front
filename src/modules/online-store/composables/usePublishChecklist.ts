import { computed, type Ref } from 'vue'

import type { Block } from '@/packages/block-editor'
import type { StoreSettings } from '@/types/store'

/**
 * Qué le falta a la tienda para estar lista.
 *
 * Existe porque el fallo típico no es que el comerciante no sepa usar el
 * editor: es que publica sin logo, sin WhatsApp o sin un solo producto
 * publicado, y se entera cuando un cliente se lo dice.
 *
 * Cada punto dice **dónde** arreglarlo (la sección del riel), no solo qué
 * falta: un "te falta el WhatsApp" sin decir dónde ponerlo obliga a buscarlo.
 *
 * `blocking` separa lo que hace inútil la tienda de lo que solo la deja a
 * medias. Sin productos publicados no hay nada que vender; sin SEO la tienda
 * funciona, solo se encuentra peor.
 */
export interface ChecklistItem {
  key: string
  label: string
  hint: string
  done: boolean
  blocking: boolean
  section: string
}

export interface ChecklistDraft {
  storeName: string
  whatsappNumber: string
  seoDescription: string
  blocks: Block[]
}

export function usePublishChecklist(
  settings: Ref<StoreSettings | undefined>,
  draft: ChecklistDraft,
  publishedProducts: Ref<number>,
) {
  const items = computed<ChecklistItem[]>(() => {
    const bloquesVisibles = draft.blocks.filter((block) => block.enabled !== false)

    return [
      {
        key: 'products',
        label: 'Tener productos publicados',
        hint: 'Marca en Catálogo los que quieres vender por internet.',
        done: publishedProducts.value > 0,
        blocking: true,
        section: 'bloques',
      },
      {
        key: 'name',
        label: 'Ponerle nombre a la tienda',
        hint: 'Es lo primero que ve quien entra y lo que aparece en Google.',
        done: draft.storeName.trim() !== '',
        blocking: true,
        section: 'identidad',
      },
      {
        key: 'blocks',
        label: 'Armar la página de inicio',
        hint: 'Con una plantilla quedas listo en un toque.',
        done: bloquesVisibles.length > 0,
        blocking: true,
        section: 'plantillas',
      },
      {
        key: 'whatsapp',
        label: 'Dejar tu WhatsApp',
        hint: 'Es por donde te van a escribir para preguntar antes de comprar.',
        done: draft.whatsappNumber.trim() !== '',
        blocking: false,
        section: 'identidad',
      },
      {
        key: 'logo',
        label: 'Subir tu logo',
        hint: 'Sin logo mostramos la inicial de tu nombre.',
        done: Boolean(settings.value?.logo_url),
        blocking: false,
        section: 'marca',
      },
      {
        key: 'seo',
        label: 'Escribir cómo apareces en Google',
        hint: 'Sin esto, Google muestra un texto suelto de tu página.',
        done: draft.seoDescription.trim() !== '',
        blocking: false,
        section: 'buscadores',
      },
    ]
  })

  const pending = computed(() => items.value.filter((item) => !item.done))
  const blockers = computed(() => pending.value.filter((item) => item.blocking))
  const ready = computed(() => blockers.value.length === 0)

  const progress = computed(() => {
    const total = items.value.length
    return total === 0 ? 100 : Math.round(((total - pending.value.length) / total) * 100)
  })

  return { items, pending, blockers, ready, progress }
}
