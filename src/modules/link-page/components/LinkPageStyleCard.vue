<script setup lang="ts">
// "Estilo de tu página": colores y tipografía de la página de enlaces, con una
// vista previa al lado. El logo, el nombre y las redes ya no se piden aquí: son
// el perfil público del negocio (PublicProfileCard) y se llenan una sola vez.
//
// Existe porque sin tienda online no había dónde elegir colores. Se guarda en
// los MISMOS campos del tema de la tienda: quien abre tienda después hereda
// este estilo, y quien ya la tiene ve aquí el de su tienda.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import StoreFontPicker from '@/modules/online-store/components/StoreFontPicker.vue'
import { BRAND_SWATCHES, SURFACE_SWATCHES } from '@/modules/online-store/support/themeSwatches'
import { NxButton, NxColorPicker } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useLinkPage } from '../composables/useLinkPage'

const { notify } = useSystemAlert()
const { linkPageQuery, updateMutation } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const primaryColor = ref('#4f46e5')
const surfaceColor = ref('#ffffff')
const fontPreset = ref('moderna')

watch(
  () => state.value?.settings,
  (settings) => {
    if (!settings) {
      return
    }
    primaryColor.value = settings.primary_color
    surfaceColor.value = settings.surface_color
    fontPreset.value = settings.font_preset
  },
  { immediate: true },
)

async function save(): Promise<void> {
  try {
    await updateMutation.mutateAsync({
      primary_color: primaryColor.value,
      surface_color: surfaceColor.value,
      font_preset: fontPreset.value,
    })
    notify('Estilo guardado', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar los cambios.'), 'error')
  }
}

// --- Vista previa ---
// Una aproximación de la página real con lo que se está editando, sin
// guardar. El texto sobre cada color se elige por luminancia, igual que hace
// la tienda (useTheme), para que la vista previa no prometa algo ilegible.
function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(value.slice(i, i + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const readableOn = (hex: string) => (luminance(hex) > 0.45 ? '#1c1917' : '#ffffff')

const FONT_FAMILIES: Record<string, string> = {
  moderna: "'Inter', system-ui, sans-serif",
  editorial: "'Zilla Slab', Georgia, serif",
  calida: "'Fraunces', Georgia, serif",
  tecnica: "'Space Grotesk', system-ui, sans-serif",
  impacto: "'Anton', Impact, 'Arial Narrow', sans-serif",
  bistro: "'Playfair Display', Georgia, serif",
  urbana: "'Bebas Neue', Impact, sans-serif",
}

const preview = computed(() => {
  const dark = luminance(surfaceColor.value) < 0.3
  return {
    background: surfaceColor.value,
    ink: dark ? '#f5f5f4' : '#1c1917',
    soft: dark ? '#a8a29e' : '#57534e',
    card: dark ? 'rgba(255,255,255,0.08)' : '#ffffff',
    line: dark ? 'rgba(255,255,255,0.15)' : '#e7e5e4',
    onPrimary: readableOn(primaryColor.value),
    heading: FONT_FAMILIES[fontPreset.value] ?? FONT_FAMILIES.moderna,
  }
})

const previewName = computed(
  () => state.value?.settings.name || state.value?.settings.business_name || '',
)
const previewButtons = computed(() => {
  const page = state.value?.page
  const buttons: string[] = []
  if (page?.has_store) buttons.push('Ver catálogo y hacer pedido')
  if (page?.has_whatsapp) buttons.push('Escríbenos por WhatsApp')
  if (page?.instagram_url) buttons.push('Instagram')
  if (page?.tiktok_url) buttons.push('TikTok')
  if (page?.facebook_url) buttons.push('Facebook')
  return buttons.length ? buttons : ['Escríbenos por WhatsApp']
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <p class="text-sm font-semibold text-slate-800">Estilo de tu página</p>
    <p class="mt-1 text-xs text-slate-500">
      Colores y letra de tu página de enlaces.
      <template v-if="state?.has_store">Es el mismo estilo de tu tienda online.</template>
    </p>

    <div v-if="state" class="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div class="flex flex-col gap-5">
        <NxColorPicker
          v-model="primaryColor"
          label="Color principal — el botón destacado"
          :swatches="BRAND_SWATCHES"
        />
        <NxColorPicker v-model="surfaceColor" label="Fondo" :swatches="SURFACE_SWATCHES" />
        <div>
          <p class="mb-2 text-xs font-medium text-slate-600">Tipografía</p>
          <StoreFontPicker v-model="fontPreset" />
        </div>

        <NxButton class="self-start" :loading="updateMutation.isPending.value" @click="save">
          Guardar estilo
        </NxButton>
      </div>

      <!-- Vista previa -->
      <div class="order-first lg:order-none">
        <p class="mb-2 text-xs font-semibold text-slate-500">Así se verá</p>
        <div
          class="mx-auto flex w-full max-w-[260px] flex-col items-center rounded-[2rem] border-4 border-slate-800 px-4 pt-8 pb-6"
          :style="{ backgroundColor: preview.background }"
        >
          <!-- Igual que la página real: el ícono en su círculo; sin ícono, el
               logo completo (no se recorta); sin ninguno, la inicial. -->
          <img
            v-if="state.page.icon_url"
            :src="state.page.icon_url"
            alt=""
            class="size-14 rounded-full object-cover"
          />
          <img
            v-else-if="state.page.logo_url"
            :src="state.page.logo_url"
            alt=""
            class="max-h-12 max-w-[170px] object-contain"
          />
          <span
            v-else
            class="flex size-14 items-center justify-center rounded-full text-xl font-bold"
            :style="{ backgroundColor: primaryColor, color: preview.onPrimary }"
          >
            {{ previewName.charAt(0).toUpperCase() }}
          </span>
          <p
            class="mt-3 text-center text-base font-bold"
            :style="{ color: preview.ink, fontFamily: preview.heading }"
          >
            {{ previewName }}
          </p>
          <p
            v-if="state.page.description"
            class="mt-1 line-clamp-2 text-center text-[11px]"
            :style="{ color: preview.soft }"
          >
            {{ state.page.description }}
          </p>
          <div class="mt-4 flex w-full flex-col gap-2">
            <span
              v-for="(label, index) in previewButtons.slice(0, 4)"
              :key="label"
              class="rounded-md border px-2 py-2 text-center text-[11px] font-semibold"
              :style="
                index === 0
                  ? {
                      backgroundColor: primaryColor,
                      color: preview.onPrimary,
                      borderColor: primaryColor,
                    }
                  : {
                      backgroundColor: preview.card,
                      color: preview.ink,
                      borderColor: preview.line,
                    }
              "
            >
              {{ label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
