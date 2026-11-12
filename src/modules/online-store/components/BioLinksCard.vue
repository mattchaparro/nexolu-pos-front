<script setup lang="ts">
// La página de enlaces de la tienda (la de la bio de Instagram o TikTok):
// compartirla y agregarle enlaces propios. La tienda, el WhatsApp, Instagram,
// Facebook y "Cómo llegar" salen solos de los datos de la tienda; aquí solo
// se agregan los demás (TikTok, Rappi, YouTube, un formulario...).
import { ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { BioLink, StoreSettings } from '@/types/store'
import { NxButton, NxInput } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useStoreSettings } from '../composables/useStoreSettings'
import ShareLinkPanel from './ShareLinkPanel.vue'

const props = defineProps<{ settings: StoreSettings }>()

/** Igual que BusinessStoreSettings::MAX_BIO_LINKS en la API. */
const MAX_LINKS = 8

const { updateMutation } = useStoreSettings()
const { notify } = useSystemAlert()

const links = ref<BioLink[]>([])
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

watch(
  () => props.settings.bio_links,
  (value) => {
    links.value = (value ?? []).map((link) => ({ ...link }))
  },
  { immediate: true },
)

function addLink(): void {
  links.value = [...links.value, { label: '', url: 'https://' }]
}

function removeLink(index: number): void {
  links.value = links.value.filter((_, i) => i !== index)
}

async function save(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null
  // Las filas que se dejaron en blanco no se mandan: no son un error.
  const payload = links.value
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label !== '' || (link.url !== '' && link.url !== 'https://'))
  try {
    await updateMutation.mutateAsync({ bio_links: payload })
    notify('Enlaces guardados')
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    if (Object.keys(fieldErrors.value).length === 0) {
      formError.value = extractErrorMessage(error, 'No pudimos guardar los enlaces.')
    }
  }
}

const automatic = [
  { label: 'Ver catálogo y hacer pedido', when: () => true },
  { label: 'WhatsApp', when: () => !!props.settings.whatsapp_number },
  { label: 'Instagram', when: () => !!props.settings.instagram_url },
  { label: 'Facebook', when: () => !!props.settings.facebook_url },
  { label: 'Cómo llegar', when: () => !!props.settings.address },
]
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <p class="text-sm font-semibold text-slate-800">Tu página de enlaces</p>
    <p class="mt-1 mb-3 text-xs text-slate-500">
      Ponla en la bio de Instagram o TikTok: una sola dirección con tu catálogo, tu WhatsApp y tus
      redes, con tu logo y tus colores.
    </p>

    <ShareLinkPanel
      :url="`${settings.public_url}/enlaces`"
      :share-text="`Encuentra a ${settings.store_name || 'mi tienda'}: catálogo, WhatsApp y redes en un solo lugar.`"
      qr-file-name="qr-enlaces"
    />

    <div class="mt-4 border-t border-slate-100 pt-4">
      <p class="text-xs font-semibold text-slate-600">Ya aparecen solos</p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="item in automatic.filter((entry) => entry.when())"
          :key="item.label"
          class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
        >
          {{ item.label }}
        </span>
      </div>
      <p class="mt-1.5 text-[11px] text-slate-400">
        Salen de los datos de tu tienda (pestaña Tienda, abajo). Si cambias el WhatsApp o el
        Instagram ahí, cambian aquí.
      </p>

      <p class="mt-4 text-xs font-semibold text-slate-600">Tus enlaces</p>
      <p class="text-[11px] text-slate-400">
        TikTok, Rappi, YouTube, un formulario… hasta {{ MAX_LINKS }}.
      </p>

      <div class="mt-2 flex flex-col gap-2">
        <div
          v-for="(link, index) in links"
          :key="index"
          class="flex flex-col gap-2 rounded-lg border border-slate-200 p-2 sm:flex-row sm:items-start"
        >
          <NxInput
            v-model="link.label"
            label="Texto del botón"
            size="sm"
            placeholder="Síguenos en TikTok"
            class="sm:w-52 sm:shrink-0"
            :error="fieldErrors[`bio_links.${index}.label`]"
          />
          <NxInput
            v-model="link.url"
            label="Dirección"
            size="sm"
            placeholder="https://"
            class="min-w-0 flex-1"
            :error="fieldErrors[`bio_links.${index}.url`]"
          />
          <button
            type="button"
            class="flex items-center gap-1.5 self-end px-2 py-1 text-xs font-semibold text-slate-400 hover:text-red-600 sm:self-center"
            aria-label="Quitar enlace"
            @click="removeLink(index)"
          >
            <i class="pi pi-trash" />
            <span class="sm:hidden">Quitar</span>
          </button>
        </div>
      </div>

      <p v-if="formError" class="mt-2 text-xs text-red-600">{{ formError }}</p>
      <p v-else-if="fieldErrors.bio_links" class="mt-2 text-xs text-red-600">
        {{ fieldErrors.bio_links }}
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <NxButton
          variant="outline"
          size="sm"
          icon="pi pi-plus"
          :disabled="links.length >= MAX_LINKS"
          @click="addLink"
        >
          Agregar enlace
        </NxButton>
        <NxButton size="sm" :loading="updateMutation.isPending.value" @click="save">
          Guardar enlaces
        </NxButton>
      </div>
    </div>
  </div>
</template>
