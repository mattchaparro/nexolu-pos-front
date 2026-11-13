<script setup lang="ts">
// El único formulario de los datos públicos del negocio: logo, ícono, nombre,
// descripción, WhatsApp y redes. Los leen la tienda online, la página de
// enlaces y los recibos, así que se llenan UNA vez y desde cualquier pantalla
// se abre este mismo modal (antes cada pantalla tenía su propia copia).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxModal, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useLinkPage } from '../composables/useLinkPage'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** A qué parte llevar al abrir: las imágenes o el contacto y las redes. */
    focus?: 'images' | 'contact'
  }>(),
  { focus: undefined },
)
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const {
  linkPageQuery,
  updateMutation,
  uploadLogoMutation,
  deleteLogoMutation,
  uploadIconMutation,
  deleteIconMutation,
} = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

const name = ref('')
const description = ref('')
const whatsapp = ref('')
const instagram = ref('')
const tiktok = ref('')
const facebookUrl = ref('')
const fieldErrors = ref<Record<string, string>>({})

const logoInput = ref<HTMLInputElement | null>(null)
const iconInput = ref<HTMLInputElement | null>(null)
const imagesSection = ref<HTMLElement | null>(null)
const contactSection = ref<HTMLElement | null>(null)

// Se vuelve a cargar cada vez que se abre: así no queda el texto a medias de
// la vez anterior ni un dato viejo si se cambió desde otra pantalla.
watch(
  () => [props.modelValue, state.value?.settings] as const,
  ([open, settings]) => {
    if (!open || !settings) {
      return
    }
    name.value = settings.name ?? ''
    description.value = settings.description ?? ''
    whatsapp.value = settings.whatsapp ?? ''
    instagram.value = settings.instagram ?? ''
    tiktok.value = settings.tiktok ?? ''
    facebookUrl.value = settings.facebook_url ?? ''
  },
  { immediate: true },
)

// Llevar a la parte que pidió quien abrió el modal (p. ej. el paso "agrega tu
// WhatsApp" del Inicio) y dejar el cursor en el primer campo vacío. El diálogo
// se monta con animación y teletransportado, así que se reintenta unos
// cuadros hasta que la sección exista.
function goToFocus(attempt = 0): void {
  const section = props.focus === 'images' ? imagesSection.value : contactSection.value
  if (!section) {
    if (attempt < 12) {
      setTimeout(() => goToFocus(attempt + 1), 50)
    }
    return
  }
  section.scrollIntoView({ block: 'center' })
  if (props.focus === 'contact') {
    const empty = Array.from(section.querySelectorAll('input')).find(
      (input) => input.value.trim() === '',
    )
    empty?.focus({ preventScroll: true })
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.focus) {
      goToFocus()
    }
  },
  { immediate: true },
)

const initial = computed(() => (name.value || state.value?.settings.business_name || '?').charAt(0).toUpperCase())

async function pick(event: Event, kind: 'logo' | 'icon'): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) {
    return
  }
  try {
    await (kind === 'logo' ? uploadLogoMutation : uploadIconMutation).mutateAsync(file)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos subir la imagen.'), 'error')
  }
}

async function save(): Promise<void> {
  fieldErrors.value = {}
  try {
    await updateMutation.mutateAsync({
      name: name.value.trim() || null,
      description: description.value.trim() || null,
      whatsapp: whatsapp.value.trim() || null,
      instagram: instagram.value.trim() || null,
      tiktok: tiktok.value.trim() || null,
      facebook_url: facebookUrl.value.trim() || null,
    })
    notify('Datos guardados', 'success')
    emit('update:modelValue', false)
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    if (Object.keys(fieldErrors.value).length === 0) {
      notify(extractErrorMessage(error, 'No pudimos guardar los cambios.'), 'error')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    title="Perfil público de tu negocio"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="state" class="flex flex-col gap-6">
      <p class="text-xs text-slate-500">
        Lo ven tus clientes en tu tienda online, en tu página de enlaces y en tus recibos. Lo llenas
        aquí una sola vez.
      </p>

      <!-- Imágenes: suben en el acto, no esperan al botón Guardar. -->
      <section ref="imagesSection" class="flex flex-col gap-3">
        <p class="text-sm font-semibold text-slate-800">Logo e ícono</p>
        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-slate-600">Logo</p>
            <div
              class="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              <img
                v-if="state.settings.logo_url"
                :src="state.settings.logo_url"
                alt="Logo"
                class="max-h-full max-w-full object-contain"
              />
              <i v-else class="pi pi-image text-slate-300" />
            </div>
            <div class="flex items-center gap-3">
              <NxButton
                size="sm"
                variant="outline"
                :loading="uploadLogoMutation.isPending.value"
                @click="logoInput?.click()"
              >
                {{ state.settings.has_logo ? 'Cambiar' : 'Subir logo' }}
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
            <p class="text-[11px] leading-snug text-slate-400">
              Horizontal, con el nombre escrito y fondo transparente. Va en la cabecera de tu
              tienda.
            </p>
            <input
              ref="logoInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="pick($event, 'logo')"
            />
          </div>

          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold text-slate-600">Ícono</p>
            <div class="flex h-24 items-center justify-center">
              <img
                v-if="state.settings.icon_url"
                :src="state.settings.icon_url"
                alt="Ícono"
                class="size-24 rounded-full border border-slate-200 object-cover"
              />
              <span
                v-else
                class="flex size-24 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-2xl font-bold text-slate-300"
              >
                {{ initial }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <NxButton
                size="sm"
                variant="outline"
                :loading="uploadIconMutation.isPending.value"
                @click="iconInput?.click()"
              >
                {{ state.settings.has_icon ? 'Cambiar' : 'Subir ícono' }}
              </NxButton>
              <button
                v-if="state.settings.has_icon"
                type="button"
                class="text-xs font-semibold text-red-500 hover:text-red-700"
                @click="deleteIconMutation.mutate()"
              >
                Quitar
              </button>
            </div>
            <p class="text-[11px] leading-snug text-slate-400">
              Cuadrado. Va en el círculo de tu página de enlaces. Si no lo subes, usamos tu logo.
            </p>
            <input
              ref="iconInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="pick($event, 'icon')"
            />
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <p class="text-sm font-semibold text-slate-800">Tu marca</p>
        <NxInput
          v-model="name"
          label="Nombre"
          :placeholder="state.settings.business_name"
          :error="fieldErrors.name"
        />
        <p class="-mt-2 text-[11px] text-slate-400">
          Si lo dejas vacío usamos el nombre de tu negocio.
        </p>
        <NxTextarea
          v-model="description"
          label="Descripción corta"
          :rows="2"
          :maxlength="300"
          placeholder="Uñas, cejas y pestañas en Sibaté."
          :error="fieldErrors.description"
        />
      </section>

      <section ref="contactSection" class="flex flex-col gap-3">
        <p class="text-sm font-semibold text-slate-800">Contacto y redes</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NxInput
            v-model="whatsapp"
            label="WhatsApp"
            placeholder="300 123 4567"
            inputmode="tel"
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
      </section>
    </div>
    <p v-else class="text-sm text-slate-400">Cargando…</p>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <NxButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton :loading="updateMutation.isPending.value" :disabled="!state" @click="save">
          Guardar
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
