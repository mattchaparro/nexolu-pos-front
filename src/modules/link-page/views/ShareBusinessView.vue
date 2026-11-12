<script setup lang="ts">
// "Compartir mi negocio" (menú del perfil, debajo de Ajustes): la página de
// enlaces para la bio, que tienen TODOS los negocios, y el catálogo si
// tienen la tienda online abierta. Es el único lugar donde se gestionan los
// enlaces; Inicio y Tienda online solo traen atajos para compartir.
import { computed } from 'vue'

import ShareLinkPanel from '@/modules/online-store/components/ShareLinkPanel.vue'
import { NxPageHeader } from '@/ui'

import LinkPageCard from '../components/LinkPageCard.vue'
import { useLinkPage } from '../composables/useLinkPage'

const { linkPageQuery } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

// El catálogo vive junto a la página de enlaces: misma tienda, otra ruta.
const catalogUrl = computed(() => state.value?.public_url.replace(/\/enlaces$/, '/tienda') ?? '')
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader
      title="Compartir mi negocio"
      subtitle="Tu página de enlaces para la bio y, si tienes tienda online, tu catálogo."
      icon="pi pi-share-alt"
      compact
    />

    <LinkPageCard />

    <div v-if="state?.has_store" class="rounded-xl border border-slate-200 bg-white p-4">
      <p class="text-sm font-semibold text-slate-800">Tu catálogo</p>
      <p class="mt-1 mb-3 text-xs text-slate-500">
        Para tus estados de WhatsApp o el mostrador: tus productos con precios al día, y el pedido
        te llega a Pedidos online.
      </p>
      <ShareLinkPanel
        :url="catalogUrl"
        :share-text="`Mira el catálogo de ${state.page.name}, con precios al día. Haz tu pedido aquí:`"
        qr-file-name="qr-catalogo"
      />
    </div>
  </div>
</template>
