<script setup lang="ts">
// La página de enlaces del negocio (la de la bio de Instagram o TikTok):
// activarla, compartirla y agregarle enlaces propios. Para TODOS los
// negocios: junta lo que ya tienen configurado (WhatsApp, Instagram, TikTok,
// dirección) y, si tienen tienda online abierta, la tienda.
//
// Se activa con un clic en vez de existir sola: si cualquier negocio tuviera
// su página publicada, se podría listar quién es cliente de Nexolú probando
// nombres en la dirección.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useSystemAlert } from '@/composables/useSystemAlert'
import ShareLinkPanel from '@/modules/online-store/components/ShareLinkPanel.vue'
import { NxButton, NxInput } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useLinkPage } from '../composables/useLinkPage'
import type { BioLink } from '../services/linkPageService'
import { confirmAction } from '@/composables/useConfirm'

/** Igual que BusinessStoreSettings::MAX_BIO_LINKS en la API. */
const MAX_LINKS = 8

const router = useRouter()
const { notify } = useSystemAlert()
const { linkPageQuery, updateMutation } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const links = ref<BioLink[]>([])
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

watch(
  () => state.value?.page.bio_links,
  (value) => {
    links.value = (value ?? []).map((link) => ({ ...link }))
  },
  { immediate: true },
)

/** Lo que aparece solo, con de dónde sale, para que sepa dónde cambiarlo. */
const automatic = computed(() => {
  const page = state.value?.page
  if (!page) {
    return []
  }
  return [
    page.has_store ? 'Tu tienda online' : null,
    page.has_whatsapp ? 'WhatsApp' : null,
    page.instagram_url ? 'Instagram' : null,
    page.tiktok_url ? 'TikTok' : null,
    page.facebook_url ? 'Facebook' : null,
    page.address ? 'Cómo llegar' : null,
  ].filter((item): item is string => item !== null)
})

async function activate(): Promise<void> {
  try {
    await updateMutation.mutateAsync({ enabled: true })
    notify('Tu página de enlaces ya está publicada', 'success')
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos activar la página.')
  }
}

async function deactivate(): Promise<void> {
  if (
    !await confirmAction('¿Despublicar tu página de enlaces? Quien tenga el enlace verá que no existe.')
  ) {
    return
  }
  await updateMutation.mutateAsync({ enabled: false })
  notify('Página de enlaces despublicada')
}

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
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-800">Tu página de enlaces</p>
        <p class="mt-1 text-xs text-slate-500">
          Para la bio de Instagram o TikTok: una sola dirección con tu WhatsApp, tus redes{{
            state?.has_store ? ' y tu catálogo' : ''
          }}.
        </p>
      </div>
      <span
        v-if="state"
        class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
        :class="state.published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
      >
        {{ state.published ? 'Publicada' : 'Sin publicar' }}
      </span>
    </div>

    <p v-if="linkPageQuery.isPending.value" class="mt-3 text-sm text-slate-400">Cargando…</p>

    <template v-else-if="state">
      <!-- Sin publicar: un solo paso para tenerla -->
      <div v-if="!state.published" class="mt-3 flex flex-col items-start gap-3">
        <p class="text-sm text-slate-600">
          Se arma sola con lo que ya tienes en Ajustes:
          <strong>{{
            automatic.length ? automatic.join(', ') : 'agrega tu WhatsApp o Instagram'
          }}</strong
          >.
        </p>
        <NxButton icon="pi pi-globe" :loading="updateMutation.isPending.value" @click="activate">
          Publicar mi página de enlaces
        </NxButton>
      </div>

      <template v-else>
        <div class="mt-3">
          <ShareLinkPanel
            :url="state.public_url"
            :share-text="`Encuentra a ${state.page.name}: WhatsApp, redes y más en un solo lugar.`"
            qr-file-name="qr-enlaces"
          />
        </div>

        <div class="mt-4 border-t border-slate-100 pt-4">
          <p class="text-xs font-semibold text-slate-600">Ya aparecen solos</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="item in automatic"
              :key="item"
              class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
            >
              {{ item }}
            </span>
            <span v-if="automatic.length === 0" class="text-xs text-amber-700">
              Nada todavía: agrega tu WhatsApp o Instagram en Ajustes.
            </span>
          </div>
          <p class="mt-1.5 text-[11px] text-slate-400">
            Salen de
            <button
              type="button"
              class="font-semibold text-indigo-600 hover:text-indigo-800"
              @click="router.push({ name: 'business-settings.index' })"
            >
              Ajustes → Negocio
            </button>
            <template v-if="state.has_store"> y de los datos de tu tienda online</template>. Si los
            cambias allá, cambian aquí.
          </p>

          <p class="mt-4 text-xs font-semibold text-slate-600">Tus enlaces</p>
          <p class="text-[11px] text-slate-400">
            Rappi, YouTube, un formulario, tu Facebook… hasta {{ MAX_LINKS }}.
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
                placeholder="Pide por Rappi"
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

          <p v-if="fieldErrors.bio_links" class="mt-2 text-xs text-red-600">
            {{ fieldErrors.bio_links }}
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-2">
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
            <!-- Con la tienda abierta queda publicada igual: despublicarla no
                 tendría efecto, así que no se ofrece. -->
            <button
              v-if="state.enabled && !state.has_store"
              type="button"
              class="ml-auto text-xs font-semibold text-slate-400 hover:text-red-600"
              @click="deactivate"
            >
              Despublicar
            </button>
          </div>
        </div>
      </template>

      <p v-if="formError" class="mt-2 text-xs text-red-600">{{ formError }}</p>
    </template>
  </div>
</template>
