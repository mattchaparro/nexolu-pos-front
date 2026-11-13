<script setup lang="ts">
// Resumen del perfil público del negocio (logo, ícono, nombre, WhatsApp y
// redes) con un botón para editarlo. Es lo que se muestra en la tienda online,
// en la página de enlaces y en el editor EN LUGAR de repetir los campos: el
// dato vive en un solo lugar (PublicProfileModal) y aquí solo se ve.
import { computed, ref } from 'vue'

import { NxButton } from '@/ui'

import { useLinkPage } from '../composables/useLinkPage'
import PublicProfileModal from './PublicProfileModal.vue'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const { linkPageQuery } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const open = ref(false)
const focus = ref<'images' | 'contact' | undefined>(undefined)

function edit(section?: 'images' | 'contact'): void {
  focus.value = section
  open.value = true
}

const rows = computed(() => {
  const settings = state.value?.settings
  if (!settings) {
    return []
  }
  return [
    { key: 'name', label: 'Nombre', value: settings.name || settings.business_name, section: undefined },
    { key: 'whatsapp', label: 'WhatsApp', value: settings.whatsapp, section: 'contact' as const },
    { key: 'instagram', label: 'Instagram', value: settings.instagram, section: 'contact' as const },
    { key: 'tiktok', label: 'TikTok', value: settings.tiktok, section: 'contact' as const },
    { key: 'facebook', label: 'Facebook', value: settings.facebook_url, section: 'contact' as const },
  ]
})

const initial = computed(() =>
  (state.value?.settings.name || state.value?.settings.business_name || '?').charAt(0).toUpperCase(),
)
</script>

<template>
  <div v-if="state" class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-800">Perfil público</p>
        <p v-if="!compact" class="mt-0.5 text-xs text-slate-500">
          Tu logo, nombre y contacto. Se usan en tu tienda, en tu página de enlaces y en tus
          recibos: se llenan una sola vez.
        </p>
      </div>
      <NxButton size="sm" variant="outline" icon="pi pi-pencil" @click="edit()">Editar</NxButton>
    </div>

    <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
      <!-- Logo e ícono -->
      <div class="flex shrink-0 items-end gap-4">
        <div class="flex flex-col items-start gap-1.5">
          <div
            class="flex h-14 min-w-20 max-w-36 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1.5"
          >
            <img
              v-if="state.settings.logo_url"
              :src="state.settings.logo_url"
              alt="Logo"
              class="max-h-full max-w-full object-contain"
            />
            <i v-else class="pi pi-image text-slate-300" />
          </div>
          <button
            type="button"
            class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            @click="edit('images')"
          >
            {{ state.settings.has_logo ? 'Cambiar logo' : 'Subir logo' }}
          </button>
        </div>
        <div class="flex flex-col items-start gap-1.5">
          <img
            v-if="state.settings.icon_url"
            :src="state.settings.icon_url"
            alt="Ícono"
            class="size-14 rounded-full border border-slate-200 object-cover"
          />
          <span
            v-else
            class="flex size-14 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-lg font-bold text-slate-300"
          >
            {{ initial }}
          </span>
          <button
            type="button"
            class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            @click="edit('images')"
          >
            {{ state.settings.has_icon ? 'Cambiar ícono' : 'Subir ícono' }}
          </button>
        </div>
      </div>

      <dl class="min-w-0 flex-1 divide-y divide-slate-100 text-sm">
        <div v-for="row in rows" :key="row.key" class="flex items-center gap-3 py-1.5">
          <dt class="w-20 shrink-0 text-xs text-slate-500">{{ row.label }}</dt>
          <dd v-if="row.value" class="min-w-0 flex-1 truncate text-slate-800">{{ row.value }}</dd>
          <dd v-else class="min-w-0 flex-1">
            <button
              type="button"
              class="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              @click="edit(row.section)"
            >
              Agregar
            </button>
          </dd>
        </div>
      </dl>
    </div>

    <PublicProfileModal v-if="open" v-model="open" :focus="focus" />
  </div>
</template>
