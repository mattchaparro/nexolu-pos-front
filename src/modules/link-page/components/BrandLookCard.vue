<script setup lang="ts">
// "Personalidad de tu marca": lo que hace que la carta y la página de enlaces
// parezcan del negocio y no de una plantilla. Colores y letra viven en la
// tarjeta de al lado (LinkPageStyleCard); aquí van la forma de los botones y
// las tarjetas, el subrayado de los títulos, la disposición de la carta y las
// dos imágenes de marca (sticker y patrón de fondo).
//
// Todo son opciones CERRADAS (ver App\Support\BrandStyle en la API): siempre
// se ven bien y el contraste de los colores sigue garantizado. No hay CSS ni
// HTML libre a propósito.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { BRAND_SWATCHES } from '@/modules/online-store/support/themeSwatches'
import { NxButton, NxColorPicker, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useLinkPage } from '../composables/useLinkPage'
import type { BrandImageKind, BrandStyle } from '../services/linkPageService'

const { notify } = useSystemAlert()
const { linkPageQuery, updateMutation, uploadBrandImageMutation, deleteBrandImageMutation } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const accent = ref('#0ea5e9')
const style = ref<BrandStyle | null>(null)

watch(
  () => state.value?.settings,
  (settings) => {
    if (!settings) {
      return
    }
    accent.value = settings.accent_color
    style.value = { ...settings.style }
  },
  { immediate: true },
)

interface Choice<T extends string> {
  value: T
  label: string
}

interface Group {
  key: keyof BrandStyle
  title: string
  hint?: string
  choices: Choice<string>[]
}

const GROUPS: { title: string; groups: Group[] }[] = [
  {
    title: 'Botones',
    groups: [
      {
        key: 'button_shape',
        title: 'Forma',
        choices: [
          { value: 'rounded', label: 'Redondeada' },
          { value: 'pill', label: 'Píldora' },
          { value: 'square', label: 'Recta' },
        ],
      },
      {
        key: 'button_fill',
        title: 'Relleno',
        hint: 'Con degradado, todos los botones llevan el color de tu marca.',
        choices: [
          { value: 'solid', label: 'Solo el principal' },
          { value: 'gradient', label: 'Todos con degradado' },
        ],
      },
    ],
  },
  {
    title: 'Portada de enlaces',
    groups: [
      {
        key: 'home_logo',
        title: 'Marca arriba',
        choices: [
          { value: 'circle', label: 'Ícono en círculo' },
          { value: 'large', label: 'Logo grande' },
        ],
      },
      {
        key: 'socials_style',
        title: 'Redes sociales',
        choices: [
          { value: 'buttons', label: 'Botones' },
          { value: 'icons', label: 'Íconos' },
        ],
      },
    ],
  },
  {
    title: 'Carta',
    groups: [
      {
        key: 'menu_layout',
        title: 'Disposición',
        hint: 'Las tarjetas muestran la foto grande y abren el detalle del plato.',
        choices: [
          { value: 'list', label: 'Lista' },
          { value: 'cards', label: 'Tarjetas con foto' },
        ],
      },
      {
        key: 'card_style',
        title: 'Tarjetas',
        choices: [
          { value: 'plain', label: 'Sencillas' },
          { value: 'outlined', label: 'Borde de marca' },
          { value: 'shadow', label: 'Con sombra' },
        ],
      },
      {
        key: 'heading_underline',
        title: 'Subrayado de los títulos',
        choices: [
          { value: 'none', label: 'Ninguno' },
          { value: 'line', label: 'Línea' },
          { value: 'brush', label: 'Pincel' },
        ],
      },
    ],
  },
]

function choose(key: keyof BrandStyle, value: string): void {
  if (style.value) {
    ;(style.value as unknown as Record<string, unknown>)[key] = value
  }
}

async function save(): Promise<void> {
  if (!style.value) {
    return
  }
  try {
    await updateMutation.mutateAsync({ accent_color: accent.value, style: { ...style.value } })
    notify('Personalidad guardada', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar los cambios.'), 'error')
  }
}

// --- Imagenes de marca ---
const stickerInput = ref<HTMLInputElement | null>(null)
const patternInput = ref<HTMLInputElement | null>(null)

async function pick(event: Event, kind: BrandImageKind): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) {
    return
  }
  try {
    await uploadBrandImageMutation.mutateAsync({ kind, file })
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos subir la imagen.'), 'error')
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <p class="text-sm font-semibold text-slate-800">Personalidad de tu marca</p>
    <p class="mt-1 text-xs text-slate-500">
      Forma de los botones y las tarjetas, imágenes de tu marca y cómo se ve la carta. Se aplica a tu
      página de enlaces y a tu carta.
    </p>

    <div v-if="state && style" class="mt-4 flex flex-col gap-6">
      <section v-for="section in GROUPS" :key="section.title" class="flex flex-col gap-4">
        <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">{{ section.title }}</p>

        <div v-for="group in section.groups" :key="group.key">
          <p class="mb-1.5 text-xs font-medium text-slate-600">{{ group.title }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="choice in group.choices"
              :key="choice.value"
              type="button"
              class="rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition"
              :class="
                style[group.key] === choice.value
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              "
              @click="choose(group.key, choice.value)"
            >
              {{ choice.label }}
            </button>
          </div>
          <p v-if="group.hint" class="mt-1 text-[11px] text-slate-400">{{ group.hint }}</p>
        </div>

        <label v-if="section.title === 'Botones'" class="flex items-center gap-3 text-sm text-slate-700">
          <NxSwitch v-model="style.button_caps" />
          Texto de los botones en MAYÚSCULAS
        </label>
      </section>

      <section class="flex flex-col gap-4">
        <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Color de acento</p>
        <NxColorPicker v-model="accent" label="Detalles y botones secundarios" :swatches="BRAND_SWATCHES" />
      </section>

      <section class="flex flex-col gap-4">
        <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Imágenes de tu marca</p>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Sticker -->
          <div class="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-semibold text-slate-600">Sticker de la portada</p>
            <div class="flex h-24 items-center justify-center rounded-lg bg-slate-50">
              <img
                v-if="state.settings.sticker_url"
                :src="state.settings.sticker_url"
                alt="Sticker"
                class="max-h-full max-w-full object-contain"
                :style="{ transform: `rotate(${style.sticker_tilt}deg)` }"
              />
              <i v-else class="pi pi-image text-slate-300" />
            </div>
            <div class="flex items-center gap-3">
              <NxButton
                size="sm"
                variant="outline"
                :loading="uploadBrandImageMutation.isPending.value"
                @click="stickerInput?.click()"
              >
                {{ state.settings.sticker_url ? 'Cambiar' : 'Subir sticker' }}
              </NxButton>
              <button
                v-if="state.settings.sticker_url"
                type="button"
                class="text-xs font-semibold text-red-500 hover:text-red-700"
                @click="deleteBrandImageMutation.mutate('sticker')"
              >
                Quitar
              </button>
            </div>
            <label class="text-[11px] text-slate-500">
              Giro: {{ style.sticker_tilt }}°
              <input v-model.number="style.sticker_tilt" type="range" min="-20" max="20" class="block w-full accent-indigo-600" />
            </label>
            <p class="text-[11px] leading-snug text-slate-400">
              Un dibujo o frase de tu marca, mejor con fondo transparente. Sale girado en una esquina.
            </p>
            <input
              ref="stickerInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="pick($event, 'sticker')"
            />
          </div>

          <!-- Patron -->
          <div class="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-semibold text-slate-600">Patrón de fondo</p>
            <div
              class="flex h-24 items-center justify-center rounded-lg bg-slate-50"
              :style="
                state.settings.pattern_url
                  ? {
                      backgroundImage: `url(${state.settings.pattern_url})`,
                      backgroundSize: '90px',
                      opacity: Math.max(style.pattern_opacity / 30, 0.25),
                    }
                  : {}
              "
            >
              <i v-if="!state.settings.pattern_url" class="pi pi-image text-slate-300" />
            </div>
            <div class="flex items-center gap-3">
              <NxButton
                size="sm"
                variant="outline"
                :loading="uploadBrandImageMutation.isPending.value"
                @click="patternInput?.click()"
              >
                {{ state.settings.pattern_url ? 'Cambiar' : 'Subir patrón' }}
              </NxButton>
              <button
                v-if="state.settings.pattern_url"
                type="button"
                class="text-xs font-semibold text-red-500 hover:text-red-700"
                @click="deleteBrandImageMutation.mutate('pattern')"
              >
                Quitar
              </button>
            </div>
            <label class="text-[11px] text-slate-500">
              Intensidad: {{ style.pattern_opacity }}%
              <input v-model.number="style.pattern_opacity" type="range" min="3" max="30" class="block w-full accent-indigo-600" />
            </label>
            <p class="text-[11px] leading-snug text-slate-400">
              Una figura que se repite muy tenue detrás de todo. Mejor PNG con fondo transparente.
            </p>
            <input
              ref="patternInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="pick($event, 'pattern')"
            />
          </div>
        </div>
      </section>

      <NxButton class="self-start" :loading="updateMutation.isPending.value" @click="save">
        Guardar personalidad
      </NxButton>
    </div>
  </div>
</template>
