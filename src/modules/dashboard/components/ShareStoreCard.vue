<script setup lang="ts">
// Atajo de Inicio para quien tiene tienda online: compartir el catálogo o la
// página de enlaces sin ir a buscarlos a Tienda online. Si la tienda está
// cerrada, invita a abrirla: es justo el momento en que el dueño mira Inicio.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import ShareCatalogModal from '@/modules/online-store/components/ShareCatalogModal.vue'
import { useStoreSettings } from '@/modules/online-store/composables/useStoreSettings'
import { NxButton } from '@/ui'

const router = useRouter()
const { settingsQuery } = useStoreSettings()
const settings = computed(() => settingsQuery.data.value)

const shareOpen = ref(false)
const shareTarget = ref<'catalog' | 'links'>('catalog')

function openShare(target: 'catalog' | 'links'): void {
  shareTarget.value = target
  shareOpen.value = true
}
</script>

<template>
  <div v-if="settings" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
      >
        <i class="pi pi-share-alt" />
      </span>

      <div class="min-w-0 flex-1">
        <template v-if="settings.is_active">
          <p class="text-sm font-semibold text-slate-800">Comparte tu tienda</p>
          <p class="text-xs text-slate-500">
            Tu catálogo para WhatsApp y tu página de enlaces para la bio de Instagram y TikTok.
          </p>
        </template>
        <template v-else>
          <p class="text-sm font-semibold text-slate-800">Tu tienda online está cerrada</p>
          <p class="text-xs text-slate-500">
            Ábrela y tendrás un catálogo virtual y una página de enlaces para compartir.
          </p>
        </template>
      </div>

      <div v-if="settings.is_active" class="grid grid-cols-2 gap-2 sm:flex">
        <NxButton size="sm" icon="pi pi-shop" @click="openShare('catalog')">Catálogo</NxButton>
        <NxButton size="sm" variant="outline" icon="pi pi-link" @click="openShare('links')">
          Enlaces
        </NxButton>
      </div>
      <NxButton
        v-else
        size="sm"
        variant="outline"
        icon="pi pi-arrow-right"
        @click="router.push({ name: 'online-store.index' })"
      >
        Ir a mi tienda
      </NxButton>
    </div>

    <ShareCatalogModal
      v-if="shareOpen"
      :key="shareTarget"
      v-model="shareOpen"
      :initial-target="shareTarget"
    />
  </div>
</template>
