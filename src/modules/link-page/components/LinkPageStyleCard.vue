<script setup lang="ts">
// "Personaliza tu página": logo, nombre, descripción, redes y estilo de la
// página de enlaces, con una vista previa al lado.
//
// Existe porque sin tienda online no había dónde elegir colores ni logo. Se
// guarda en los MISMOS campos del tema de la tienda: quien abre tienda
// después hereda este estilo, y quien ya la tiene ve aquí el de su tienda.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import StoreFontPicker from '@/modules/online-store/components/StoreFontPicker.vue'
import { BRAND_SWATCHES, SURFACE_SWATCHES } from '@/modules/online-store/support/themeSwatches'
import { NxButton, NxColorPicker, NxInput, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useLinkPage } from '../composables/useLinkPage'

const { notify } = useSystemAlert()
const { linkPageQuery, updateMutation, uploadLogoMutation, deleteLogoMutation } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const name = ref('')
const description = ref('')
const primaryColor = ref('#4f46e5')
const surfaceColor = ref('#ffffff')
const fontPreset = ref('moderna')
const instagram = ref('')
const tiktok = ref('')
const whatsapp = ref('')
const facebookUrl = ref('')
const fieldErrors = ref<Record<string, string>>({})
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => state.value?.settings,
  (settings) => {
    if (!settings) {
      return
    }
    name.value = settings.name ?? ''
    description.value = settings.description ?? ''
    primaryColor.value = settings.primary_color
    surfaceColor.value = settings.surface_color
    fontPreset.value = settings.font_preset
    instagram.value = settings.instagram ?? ''
    tiktok.value = settings.tiktok ?? ''
    whatsapp.value = settings.whatsapp ?? ''
    facebookUrl.value = settings.facebook_url ?? ''
  },
  { immediate: true },
)

async function save(): Promise<void> {
  fieldErrors.value = {}
  try {
    await updateMutation.mutateAsync({
      name: name.value.trim() || null,
      description: description.value.trim() || null,
      primary_color: primaryColor.value,
      surface_color: surfaceColor.value,
      font_preset: fontPreset.value,
      instagram: instagram.value.trim() || null,
      tiktok: tiktok.value.trim() || null,
      whatsapp: whatsapp.value.trim() || null,
      facebook_url: facebookUrl.value.trim() || null,
    })
    notify('Página actualizada', 'success')
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    if (Object.keys(fieldErrors.value).length === 0) {
      notify(extractErrorMessage(error, 'No pudimos guardar los cambios.'), 'error')
    }
  }
}

async function onLogoPicked(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) {
    return
  }
  try {
    await uploadLogoMutation.mutateAsync(file)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos subir el logo.'), 'error')
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

const previewName = computed(() => name.value.trim() || state.value?.settings.business_name || '')
const previewButtons = computed(() => {
  const buttons: string[] = []
  if (state.value?.has_store) buttons.push('Ver catálogo y hacer pedido')
  if (whatsapp.value.trim()) buttons.push('Escríbenos por WhatsApp')
  if (instagram.value.trim()) buttons.push('Instagram')
  if (tiktok.value.trim()) buttons.push('TikTok')
  if (facebookUrl.value.trim()) buttons.push('Facebook')
  return buttons.length ? buttons : ['Escríbenos por WhatsApp']
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <p class="text-sm font-semibold text-slate-800">Personaliza tu página</p>
    <p class="mt-1 text-xs text-slate-500">
      Tu logo, tus redes y tus colores.
      <template v-if="state?.has_store">Es el mismo estilo de tu tienda online.</template>
    </p>

    <div v-if="state" class="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div class="flex flex-col gap-5">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <img
            v-if="state.page.logo_url"
            :src="state.page.logo_url"
            alt="Logo"
            class="size-16 rounded-full border border-slate-200 object-cover"
          />
          <span
            v-else
            class="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400"
          >
            <i class="pi pi-image" />
          </span>
          <div class="flex flex-col gap-1">
            <div class="flex gap-2">
              <NxButton
                size="sm"
                variant="outline"
                :loading="uploadLogoMutation.isPending.value"
                @click="fileInput?.click()"
              >
                {{ state.settings.has_logo ? 'Cambiar logo' : 'Subir logo' }}
              </NxButton>
              <button
                v-if="state.settings.has_logo"
                type="button"
                class="text-xs font-semibold text-red-500 hover:text-red-700"
                @click="deleteLogoMutation.mutate()"
              >
                Quitar
              </button>
            </div>
            <p class="text-[11px] text-slate-400">Cuadrado, en JPG, PNG o WebP.</p>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onLogoPicked"
          />
        </div>

        <!-- Nombre y descripción -->
        <div class="flex flex-col gap-3">
          <NxInput
            v-model="name"
            label="Nombre"
            :placeholder="state.settings.business_name"
            :error="fieldErrors.name"
          />
          <NxTextarea
            v-model="description"
            label="Descripción corta"
            :rows="2"
            :maxlength="300"
            placeholder="Uñas, cejas y pestañas en Sibaté."
            :error="fieldErrors.description"
          />
        </div>

        <!-- Redes -->
        <div class="flex flex-col gap-3">
          <p class="text-xs font-semibold text-slate-600">Tus redes</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NxInput
              v-model="whatsapp"
              label="WhatsApp"
              placeholder="300 123 4567"
              :error="fieldErrors.whatsapp"
            />
            <NxInput
              v-model="instagram"
              label="Instagram"
              placeholder="@tunegocio"
              :error="fieldErrors.instagram"
            />
            <NxInput
              v-model="tiktok"
              label="TikTok"
              placeholder="@tunegocio"
              :error="fieldErrors.tiktok"
            />
            <NxInput
              v-model="facebookUrl"
              label="Facebook"
              placeholder="https://facebook.com/tunegocio"
              :error="fieldErrors.facebook_url"
            />
          </div>
          <p class="text-[11px] text-slate-400">
            Son los mismos de Ajustes → Negocio: si los cambias aquí, cambian allá.
          </p>
        </div>

        <!-- Estilo -->
        <div class="flex flex-col gap-4">
          <p class="text-xs font-semibold text-slate-600">Estilo</p>
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
        </div>

        <NxButton class="self-start" :loading="updateMutation.isPending.value" @click="save">
          Guardar cambios
        </NxButton>
      </div>

      <!-- Vista previa -->
      <div class="order-first lg:order-none">
        <p class="mb-2 text-xs font-semibold text-slate-500">Así se verá</p>
        <div
          class="mx-auto flex w-full max-w-[260px] flex-col items-center rounded-[2rem] border-4 border-slate-800 px-4 pt-8 pb-6"
          :style="{ backgroundColor: preview.background }"
        >
          <img
            v-if="state.page.logo_url"
            :src="state.page.logo_url"
            alt=""
            class="size-14 rounded-full object-cover"
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
            v-if="description.trim()"
            class="mt-1 line-clamp-2 text-center text-[11px]"
            :style="{ color: preview.soft }"
          >
            {{ description }}
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
