<script setup lang="ts">
// Atajo de Inicio para compartir el negocio: la página de enlaces (para
// todos, la de la bio de Instagram o TikTok) y, si tiene la tienda online
// abierta, el catálogo. Si tiene el módulo de tienda pero cerrada, invita a
// abrirla.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import ShareLinkPageModal from '@/modules/link-page/components/ShareLinkPageModal.vue'
import { useLinkPage } from '@/modules/link-page/composables/useLinkPage'
import ShareCatalogModal from '@/modules/online-store/components/ShareCatalogModal.vue'
import { NxButton } from '@/ui'
import { hasFeature } from '@/utils/hasFeature'

const router = useRouter()
const { data: business } = useBusiness()
const { linkPageQuery } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const hasStoreModule = computed(() => hasFeature(business.value, 'online_store'))
// Un restaurante comparte su menú digital, no una tienda.
const isMenu = computed(() => hasFeature(business.value, 'digital_menu'))

const catalogOpen = ref(false)
const linksOpen = ref(false)
</script>

<template>
  <div v-if="state" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
      >
        <i class="pi pi-share-alt" />
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-slate-800">Comparte tu negocio</p>
        <p class="text-xs text-slate-500">
          <template v-if="state.has_store && isMenu">
            Tu menú para las mesas y WhatsApp, y tu página de enlaces para la bio de Instagram.
          </template>
          <template v-else-if="state.has_store">
            Tu catálogo para WhatsApp y tu página de enlaces para la bio de Instagram y TikTok.
          </template>
          <template v-else>
            Tu WhatsApp, Instagram y TikTok en un solo enlace para poner en tu bio.
          </template>
          <button
            v-if="isMenu && !state.has_store"
            type="button"
            class="font-semibold text-indigo-600 hover:text-indigo-800"
            @click="router.push({ name: 'digital-menu.index' })"
          >
            Publica tu menú digital.
          </button>
          <button
            v-else-if="hasStoreModule && !state.has_store"
            type="button"
            class="font-semibold text-indigo-600 hover:text-indigo-800"
            @click="router.push({ name: 'online-store.index' })"
          >
            Abre tu tienda online para sumar tu catálogo.
          </button>
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:flex">
        <NxButton
          v-if="state.has_store && isMenu"
          size="sm"
          icon="pi pi-book"
          @click="router.push({ name: 'digital-menu.index' })"
        >
          Menú
        </NxButton>
        <NxButton
          v-else-if="state.has_store"
          size="sm"
          icon="pi pi-shop"
          @click="catalogOpen = true"
        >
          Catálogo
        </NxButton>
        <NxButton
          size="sm"
          :variant="state.has_store ? 'outline' : 'primary'"
          icon="pi pi-link"
          :class="{ 'col-span-2': !state.has_store }"
          @click="linksOpen = true"
        >
          {{ state.published ? 'Enlaces' : 'Crear mi página de enlaces' }}
        </NxButton>
        <NxButton
          v-if="state.published"
          size="sm"
          variant="outline"
          icon="pi pi-palette"
          :class="{ 'col-span-2': !state.has_store }"
          @click="router.push({ name: 'share-business.index' })"
        >
          Personalizar
        </NxButton>
      </div>
    </div>

    <ShareCatalogModal v-if="catalogOpen" v-model="catalogOpen" initial-target="catalog" />
    <ShareLinkPageModal v-if="linksOpen" v-model="linksOpen" />
  </div>
</template>
