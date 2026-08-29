<script setup lang="ts">
// El editor de la tienda, a pantalla completa.
//
// Vive fuera del layout del POS a proposito: es una pantalla de trabajo
// continuo -- se entra, se arma la pagina, se sale -- no una seccion que se
// consulta. El menu lateral y la navbar del POS solo le quitarian espacio a
// lo unico que importa aqui, que es ver la tienda mientras se edita.
//
// Tres columnas, como cualquier editor visual: secciones a la izquierda,
// la tienda en vivo al centro, y el formulario de la seccion activa a la
// derecha.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { BlockEditor, type Block } from '@/packages/block-editor'
import type { StoreSettings } from '@/types/store'
import { NxButton, NxInput } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import HomePresetPicker from '../components/HomePresetPicker.vue'
import StoreFontPicker from '../components/StoreFontPicker.vue'
import StoreHomePreview from '../components/StoreHomePreview.vue'
import StoreImageField from '../components/StoreImageField.vue'
import StoreImagePicker from '../components/StoreImagePicker.vue'
import StoreProductPicker from '../components/StoreProductPicker.vue'
import { useStoreImageLibrary } from '../composables/useStoreImageLibrary'
import { useStoreSettings } from '../composables/useStoreSettings'
import { HOME_BLOCK_CATALOG } from '../homeBlockCatalog'
import type { HomePreset } from '../homePresets'

const router = useRouter()
const { settingsQuery, updateMutation } = useStoreSettings()
const { imagesQuery } = useStoreImageLibrary()

const settings = computed(() => settingsQuery.data.value)

const homeBlocks = ref<Block[]>([])
const primaryColor = ref('#4f46e5')
const surfaceColor = ref('#ffffff')
const accentColor = ref('#0ea5e9')
const fontPreset = ref('moderna')
const errorMessage = ref<string | null>(null)
const saved = ref(false)

const EDITOR_SECTIONS = [
  { value: 'bloques', label: 'Bloques', icon: 'pi-th-large' },
  { value: 'plantillas', label: 'Plantillas', icon: 'pi-clone' },
  { value: 'colores', label: 'Colores', icon: 'pi-palette' },
  { value: 'tipografia', label: 'Letra', icon: 'pi-pencil' },
  { value: 'marca', label: 'Marca', icon: 'pi-image' },
] as const

const editorSection = ref<(typeof EDITOR_SECTIONS)[number]['value']>('bloques')
const previewWidth = ref<'mobile' | 'desktop'>('desktop')

watch(
  settings,
  (value) => {
    if (!value) {
      return
    }
    // Copia, no referencia: el editor muta la lista y no debe tocar la
    // cache de la consulta.
    homeBlocks.value = (value.home_blocks ?? []).map((block) => ({ ...block })) as Block[]
    primaryColor.value = value.primary_color ?? '#4f46e5'
    surfaceColor.value = value.surface_color ?? '#ffffff'
    accentColor.value = value.accent_color ?? '#0ea5e9'
    fontPreset.value = value.font_preset ?? 'moderna'
  },
  { immediate: true },
)

/**
 * Los ajustes con lo que se esta editando AHORA, no lo guardado: la vista
 * previa tiene que mostrar el borrador completo, no la mitad.
 */
const previewSettings = computed(() => ({
  ...(settings.value as StoreSettings),
  primary_color: primaryColor.value,
  surface_color: surfaceColor.value,
  accent_color: accentColor.value,
  font_preset: fontPreset.value,
}))

function applyPreset(payload: { blocks: Block[]; theme: HomePreset['theme'] | null }): void {
  homeBlocks.value = payload.blocks
  if (payload.theme) {
    primaryColor.value = payload.theme.primary
    surfaceColor.value = payload.theme.surface
    accentColor.value = payload.theme.accent
    fontPreset.value = payload.theme.font
  }
  editorSection.value = 'bloques'
}

async function save(): Promise<void> {
  errorMessage.value = null
  try {
    await updateMutation.mutateAsync({
      home_blocks: homeBlocks.value,
      primary_color: primaryColor.value,
      surface_color: surfaceColor.value,
      accent_color: accentColor.value,
      font_preset: fontPreset.value,
    })
    // Confirmacion breve en el mismo boton: un toast obligaria a mirar a
    // otro lado en una pantalla donde la atencion esta en el centro.
    saved.value = true
    window.setTimeout(() => (saved.value = false), 2500)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos guardar los cambios.')
  }
}
</script>

<template>
  <div class="flex h-screen flex-col bg-slate-100">
    <!-- Barra superior: salir, estado y guardar. -->
    <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
      <div class="flex min-w-0 items-center gap-2">
        <button
          type="button"
          class="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          @click="router.push({ name: 'online-store.index' })"
        >
          <i class="pi pi-arrow-left mr-1 text-xs" /> Salir
        </button>
        <span class="min-w-0 truncate text-sm font-semibold text-slate-800">
          Editor de {{ settings?.store_name || 'tu tienda' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <p v-if="errorMessage" class="max-w-xs truncate text-xs text-red-600">{{ errorMessage }}</p>
        <NxButton :loading="updateMutation.isPending.value" @click="save">
          {{ saved ? 'Guardado' : 'Guardar' }}
        </NxButton>
      </div>
    </header>

    <!-- Un editor visual en un telefono es pelear con el espacio. -->
    <div class="flex flex-1 items-center justify-center p-6 lg:hidden">
      <div class="max-w-sm text-center">
        <p class="text-4xl">🖥️</p>
        <p class="mt-3 text-sm font-semibold text-slate-800">Mejor desde un computador</p>
        <p class="mt-1 text-xs text-slate-500">
          El editor necesita espacio para mostrarte tu tienda mientras la armas. Ábrelo desde un
          computador o una tablet en horizontal.
        </p>
        <NxButton class="mt-4" variant="outline" @click="router.push({ name: 'online-store.index' })">
          Volver
        </NxButton>
      </div>
    </div>

    <div class="hidden min-h-0 flex-1 lg:flex">
      <!-- Izquierda: las secciones. -->
      <nav class="flex w-20 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-2">
        <button
          v-for="section in EDITOR_SECTIONS"
          :key="section.value"
          type="button"
          class="flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition"
          :class="
            editorSection === section.value
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-400 hover:bg-slate-50'
          "
          @click="editorSection = section.value"
        >
          <i class="pi text-base" :class="section.icon" />
          <span class="text-[10px] font-semibold leading-tight">{{ section.label }}</span>
        </button>
      </nav>

      <!-- Centro: la tienda, en vivo. -->
      <main class="min-w-0 flex-1 overflow-hidden p-3">
        <StoreHomePreview
          v-if="settings"
          v-model:width="previewWidth"
          class="h-full"
          :blocks="homeBlocks"
          :settings="previewSettings"
          :images="imagesQuery.data.value ?? []"
        />
      </main>

      <!-- Derecha: el formulario de la seccion activa. -->
      <aside class="w-[380px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
        <HomePresetPicker
          v-if="editorSection === 'plantillas'"
          :has-blocks="homeBlocks.length > 0"
          @apply="applyPreset"
          @close="editorSection = 'bloques'"
        />

        <BlockEditor
          v-else-if="editorSection === 'bloques'"
          v-model="homeBlocks"
          :catalog="HOME_BLOCK_CATALOG"
        >
          <template #image-picker="{ value, onSelect }">
            <StoreImagePicker :value="value" @select="onSelect" />
          </template>
          <template #images-picker="{ value, max, onSelect }">
            <StoreImagePicker :value="value" :max="max" multiple @select="onSelect" />
          </template>
          <template #entity-picker="{ value, max, onSelect }">
            <StoreProductPicker :value="value" :max="max" @select="onSelect" />
          </template>
        </BlockEditor>

          <div v-else-if="editorSection === 'colores'">
            <p class="mb-1 text-sm font-semibold text-slate-700">Colores</p>
            <p class="mb-3 text-[11px] text-slate-400">
              Con estos tres armamos toda la tienda. El color del texto lo calculamos solos para que siempre se lea.
            </p>
            <div class="flex flex-col gap-3">
              <div class="flex items-end gap-3">
                <NxInput v-model="primaryColor" label="Marca — botones y precios" class="flex-1" />
                <span class="mb-1 h-8 w-8 shrink-0 rounded-lg border border-slate-200" :style="{ backgroundColor: primaryColor }" />
              </div>
              <div class="flex items-end gap-3">
                <NxInput v-model="surfaceColor" label="Fondo de la tienda" class="flex-1" />
                <span class="mb-1 h-8 w-8 shrink-0 rounded-lg border border-slate-200" :style="{ backgroundColor: surfaceColor }" />
              </div>
              <div class="flex items-end gap-3">
                <NxInput v-model="accentColor" label="Acento — etiquetas y destacados" class="flex-1" />
                <span class="mb-1 h-8 w-8 shrink-0 rounded-lg border border-slate-200" :style="{ backgroundColor: accentColor }" />
              </div>
            </div>
            <!-- Muestra rápida con los tres colores juntos -->
            <div class="mt-4 rounded-lg border border-slate-200 p-3" :style="{ backgroundColor: surfaceColor }">
              <p class="text-xs font-semibold" :style="{ color: primaryColor }">Así se ve tu marca</p>
              <span
                class="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :style="{ backgroundColor: accentColor, color: '#fff' }"
                >
                Etiqueta destacada
              </span>
            </div>
          </div>

        <div v-else-if="editorSection === 'tipografia'">
          <p class="mb-1 text-sm font-semibold text-slate-700">Tipografia</p>
          <p class="mb-3 text-[11px] text-slate-400">Asi se va a ver el texto de tu tienda.</p>
          <StoreFontPicker v-model="fontPreset" />
        </div>

          <div v-else-if="editorSection === 'marca' && settings">
            <p class="mb-3 text-sm font-semibold text-slate-700">Logo y portada</p>
            <div class="flex flex-col gap-4">
              <StoreImageField image-slot="logo" label="Logo" :url="settings.logo_url" aspect="square" hint="Cuadrado, se ve pequeño." />
              <StoreImageField
                image-slot="banner"
                label="Portada"
                :url="settings.banner_url"
                aspect="wide"
                hint="Banda ancha arriba de la tienda."
                />
              </div>
            </div>
      </aside>
    </div>
  </div>
</template>
