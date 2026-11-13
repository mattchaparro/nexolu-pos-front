<script setup lang="ts">
// "Compartir" de Inicio: un botón en la cabecera con un menú corto, en vez de
// una franja entera. La mayoría de negocios comparte su enlace una o dos
// veces; no tiene por qué ocupar la pantalla todos los días.
// Comparte la página de enlaces (bio de Instagram/TikTok) y, si tiene, el
// menú digital o el catálogo. Si tiene el módulo pero no lo ha publicado,
// invita a hacerlo.
import { onClickOutside } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import ShareLinkPageModal from '@/modules/link-page/components/ShareLinkPageModal.vue'
import { useLinkPage } from '@/modules/link-page/composables/useLinkPage'
import ShareCatalogModal from '@/modules/online-store/components/ShareCatalogModal.vue'
import { hasFeature } from '@/utils/hasFeature'

const router = useRouter()
const { data: business } = useBusiness()
const { linkPageQuery } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const hasStoreModule = computed(() => hasFeature(business.value, 'online_store'))
// Un restaurante comparte su menú digital, no una tienda.
const isMenu = computed(() => hasFeature(business.value, 'digital_menu'))

const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => {
  open.value = false
})

const catalogOpen = ref(false)
const linksOpen = ref(false)

interface MenuEntry {
  key: string
  icon: string
  label: string
  hint: string
  run: () => void
}

const entries = computed<MenuEntry[]>(() => {
  const s = state.value
  if (!s) {
    return []
  }
  const list: MenuEntry[] = []
  if (isMenu.value) {
    list.push(
      s.has_store
        ? { key: 'menu', icon: 'pi pi-book', label: 'Menú digital', hint: 'QR y enlace para mesas y WhatsApp', run: () => router.push({ name: 'digital-menu.index' }) }
        : { key: 'menu', icon: 'pi pi-book', label: 'Publicar menú digital', hint: 'Que tus clientes pidan desde el celular', run: () => router.push({ name: 'digital-menu.index' }) },
    )
  } else if (s.has_store) {
    list.push({ key: 'catalog', icon: 'pi pi-shop', label: 'Catálogo', hint: 'Para enviar por WhatsApp', run: () => (catalogOpen.value = true) })
  } else if (hasStoreModule.value) {
    list.push({ key: 'store', icon: 'pi pi-shop', label: 'Abrir tienda online', hint: 'Suma tu catálogo al enlace', run: () => router.push({ name: 'online-store.index' }) })
  }
  list.push({
    key: 'links',
    icon: 'pi pi-link',
    label: s.published ? 'Página de enlaces' : 'Crear página de enlaces',
    hint: 'WhatsApp, Instagram y TikTok en un enlace',
    run: () => (linksOpen.value = true),
  })
  if (s.published) {
    list.push({ key: 'style', icon: 'pi pi-palette', label: 'Personalizar', hint: 'Colores, logo y botones', run: () => router.push({ name: 'share-business.index' }) })
  }
  return list
})

function choose(entry: MenuEntry): void {
  open.value = false
  entry.run()
}
</script>

<template>
  <div v-if="state" ref="root" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
      :aria-expanded="open"
      aria-label="Compartir"
      @click="open = !open"
    >
      <i class="pi pi-share-alt" />
      <!-- En el celular solo el icono: el nombre del negocio necesita el espacio. -->
      <span class="hidden sm:inline">Compartir</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
    >
      <button
        v-for="entry in entries"
        :key="entry.key"
        type="button"
        class="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
        @click="choose(entry)"
      >
        <i :class="entry.icon" class="mt-0.5 text-indigo-600" />
        <span class="min-w-0">
          <span class="block text-sm font-medium text-slate-800">{{ entry.label }}</span>
          <span class="block text-xs text-slate-500">{{ entry.hint }}</span>
        </span>
      </button>
    </div>

    <ShareCatalogModal v-if="catalogOpen" v-model="catalogOpen" initial-target="catalog" />
    <ShareLinkPageModal v-if="linksOpen" v-model="linksOpen" />
  </div>
</template>
