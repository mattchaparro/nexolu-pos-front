<script setup lang="ts">
// Vista previa en vivo del home mientras se edita.
//
// Es un iframe de la TIENDA DE VERDAD, no un redibujo dentro del POS. Dos
// renderizadores se desincronizan y el comerciante terminaría publicando
// algo distinto de lo que vio. Aquí son los mismos componentes, el mismo
// CSS y el mismo tema.
//
// El borrador viaja por postMessage con el origen explícito: nunca '*'.
// Mandar a '*' significaría filtrar el contenido de la tienda a cualquier
// página que llegara a incrustarse ahí.
import { computed, ref, watch } from 'vue'

import type { HomeBlock, StoreSettings } from '@/types/store'

import type { StoreLibraryImage } from '../services/storeSettingsService'

const props = defineProps<{
  blocks: HomeBlock[]
  settings: StoreSettings
  images: StoreLibraryImage[]
}>()

type Width = 'mobile' | 'desktop'
const width = defineModel<Width>('width', { default: 'desktop' })

/**
 * Los dos controles de espacio. Viven acá y no en la vista porque su sitio
 * natural es junto a los de celular/computador: son la misma decisión —
 * cuánta pantalla le doy a la tienda.
 */
const maximized = defineModel<boolean>('maximized', { default: false })
const panelOpen = defineModel<boolean>('panelOpen', { default: true })
const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)

/**
 * Qué página de la tienda se está mirando.
 *
 * Antes solo se veía el inicio: para saber cómo quedaba tu ficha de producto
 * o tu catálogo con tus colores había que salir del editor y abrir la tienda
 * aparte. Los bloques solo aplican al inicio, pero el TEMA — colores,
 * tipografía, logo — se ve en todas.
 */
type PreviewPage = 'home' | 'catalog'

const page = ref<PreviewPage>('home')

const PAGE_PATHS: Record<PreviewPage, string> = {
  home: '',
  catalog: '/tienda',
}

const previewUrl = computed(() => {
  const base = props.settings.public_url
  return base ? `${base}${PAGE_PATHS[page.value]}?preview=1` : ''
})

// Cambiar de página recarga el iframe, así que la tienda vuelve a avisar
// "listo" y hay que esperar ese aviso antes de mandarle el borrador.
watch(page, () => {
  ready.value = false
})

const emit = defineEmits<{ select: [blockId: string] }>()

const targetOrigin = computed(() => {
  try {
    return new URL(props.settings.public_url).origin
  } catch {
    return ''
  }
})

/**
 * El borrador guarda `image_id`; la tienda pinta URLs. Se resuelven aquí
 * porque el POS ya tiene la biblioteca cargada — así la tienda en modo
 * vista previa no necesita consultar nada del comercio.
 */
function withImages(block: HomeBlock): HomeBlock {
  const byId = new Map(props.images.map((image) => [image.id, image]))
  const resolved: HomeBlock = { ...block }

  if (typeof block.image_id === 'number') {
    resolved.image_url = byId.get(block.image_id)?.url ?? null
  }
  if (Array.isArray(block.image_ids)) {
    resolved.images = (block.image_ids as number[])
      .map((id) => byId.get(id))
      .filter((image): image is StoreLibraryImage => image !== undefined)
      .map((image) => ({ url: image.url, thumbnail_url: image.thumbnail_url, alt: image.alt }))
  }
  return resolved
}

function send(): void {
  if (!frame.value?.contentWindow || !targetOrigin.value) {
    return
  }

  const payload = {
    source: 'nexolu-store-preview',
    // Los apagados no viajan: la vista previa muestra lo que va a ver el
    // comprador, no lo que hay en el editor.
    blocks: props.blocks.filter((block) => block.enabled !== false).map(withImages),
    theme: {
      primary: props.settings.primary_color,
      surface: props.settings.surface_color,
      accent: props.settings.accent_color,
      font: props.settings.font_preset,
    },
    // El logo y la portada no son bloques ni tema, pero se ven igual: sin
    // esto la cabecera de la vista previa se quedaba con la imagen vieja
    // mientras el comerciante cambiaba la suya.
    // Todo lo que la tienda pinta fuera de los bloques: cabecera, pie y los
    // avisos del carrito. Sin esto, cambiar el nombre o el pedido minimo en
    // el editor no se veia hasta guardar y recargar.
    identity: {
      logo_url: props.settings.logo_url,
      banner_url: props.settings.banner_url,
      name: props.settings.store_name,
      description: props.settings.description,
      whatsapp_number: props.settings.whatsapp_number,
      min_order_amount: props.settings.min_order_amount,
      shipping_flat_fee: props.settings.shipping_flat_fee,
    },
  }

  // A datos planos ANTES de enviar. `postMessage` clona con el algoritmo
  // structured clone, que no sabe clonar un Proxy: los bloques vienen de un
  // `ref`, así que sus arrays anidados (los `items` de una franja, por
  // ejemplo) son proxies reactivos y hacen que reviente con DataCloneError.
  //
  // El error se lanzaba dentro del ciclo de actualización de Vue y abortaba
  // el re-render de toda la pestaña: la consecuencia visible no era una
  // vista previa rota, era que los botones de la pantalla dejaban de
  // responder. Todo lo que viaja aquí es JSON puro, así que serializar es
  // suficiente y explícito.
  frame.value.contentWindow.postMessage(JSON.parse(JSON.stringify(payload)), targetOrigin.value)
}

// La tienda avisa cuando está lista para recibir: sin eso, el primer envío
// puede llegar antes de que monte y se pierde.
function onFrameMessage(event: MessageEvent): void {
  if (event.origin !== targetOrigin.value) {
    return
  }
  const data = event.data as { ready?: boolean; source?: string; blockId?: string }

  if (data?.ready) {
    ready.value = true
    send()
    return
  }

  // Tocaron un bloque en la vista previa: el editor lo abre. Es lo que evita
  // tener que adivinar en el riel cuál tarjeta es la que estás mirando.
  if (data?.source === 'nexolu-store-preview-click' && data.blockId) {
    emit('select', data.blockId)
  }
}

window.addEventListener('message', onFrameMessage)

// Cada cambio se refleja. `deep` porque editar un campo muta el bloque, no
// reemplaza la lista.
watch(() => [props.blocks, props.settings], send, { deep: true })
</script>

<template>
  <div class="flex min-h-0 flex-col gap-2">
    <div class="flex items-center justify-between">
      <p class="text-sm font-semibold text-slate-700">
        {{ page === 'home' ? 'Tu página de inicio' : 'Tu tienda' }}
        <span class="font-normal text-slate-400">
          · {{ width === 'mobile' ? 'celular' : 'computador' }}
        </span>
      </p>
      <div class="flex gap-1">
        <button
          v-for="option in [
            { value: 'mobile' as const, icon: 'pi-mobile', title: 'Celular' },
            { value: 'desktop' as const, icon: 'pi-desktop', title: 'Escritorio' },
          ]"
          :key="option.value"
          type="button"
          class="rounded-lg border px-2.5 py-1.5 text-xs"
          :class="
            width === option.value
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-400 hover:border-slate-300'
          "
          :title="option.title"
          @click="width = option.value"
        >
          <i class="pi" :class="option.icon" />
        </button>

        <span class="mx-1 w-px bg-slate-200" aria-hidden="true" />

        <!-- Qué página se mira. Los bloques son del inicio, pero el tema se
             ve en todas: sin esto no había forma de revisar la ficha de
             producto con tus colores sin salir del editor. -->
        <button
          v-for="option in [
            { value: 'home' as const, icon: 'pi-home', title: 'Inicio' },
            { value: 'catalog' as const, icon: 'pi-shopping-bag', title: 'Tienda' },
          ]"
          :key="option.value"
          type="button"
          class="rounded-lg border px-2.5 py-1.5 text-xs"
          :class="
            page === option.value
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-400 hover:border-slate-300'
          "
          :title="option.title"
          @click="page = option.value"
        >
          <i class="pi" :class="option.icon" />
        </button>

        <span class="mx-1 w-px bg-slate-200" aria-hidden="true" />

        <!-- Plegar el formulario. En pantalla completa no aplica: ahí ya no
             hay formulario que plegar. -->
        <button
          v-if="!maximized"
          type="button"
          class="hidden rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-300 lg:block"
          :title="panelOpen ? 'Ocultar el formulario' : 'Mostrar el formulario'"
          @click="panelOpen = !panelOpen"
        >
          <i class="pi" :class="panelOpen ? 'pi-angle-double-right' : 'pi-angle-double-left'" />
        </button>

        <button
          type="button"
          class="rounded-lg border px-2.5 py-1.5 text-xs"
          :class="
            maximized
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 text-slate-400 hover:border-slate-300'
          "
          :title="maximized ? 'Salir de pantalla completa' : 'Pantalla completa'"
          @click="maximized = !maximized"
        >
          <i class="pi" :class="maximized ? 'pi-window-minimize' : 'pi-window-maximize'" />
        </button>
      </div>
    </div>

    <div
      class="flex min-h-0 flex-1 justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3"
    >
      <iframe
        v-if="previewUrl"
        ref="frame"
        :src="previewUrl"
        class="h-full min-h-[60vh] rounded-lg border border-slate-200 bg-white transition-all"
        :class="width === 'mobile' ? 'w-[375px]' : 'w-full'"
        title="Vista previa de la tienda"
        @load="send"
      />
      <p v-else class="py-12 text-center text-sm text-slate-400">
        Abre tu tienda para poder previsualizarla.
      </p>
    </div>

    <p class="text-[11px] text-slate-400">
      Es tu tienda real. Los cambios se ven aquí antes de guardar; para que los vea un comprador,
      guarda la página.
    </p>
  </div>
</template>
