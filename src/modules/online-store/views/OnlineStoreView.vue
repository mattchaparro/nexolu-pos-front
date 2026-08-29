<script setup lang="ts">
// Panel de la tienda online para el comerciante, en tres pestañas:
//
// - Tienda: abrirla o cerrarla, contacto y condiciones de venta.
// - Apariencia: las tres semillas de color, la tipografía, logo y banner.
// - Home: los bloques opcionales del inicio (hero, servicios, historia).
//
// El interruptor de arriba es SUYO (publicar o no publicar). Que el módulo
// exista es decisión de SuperAdmin via el feature flag `online_store`, y si
// está apagado esta pantalla ni siquiera aparece en el menú.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { StoreSettingsPayload, StoryStat, TrustItem } from '@/types/store'
import {
  NxButton,
  NxInput,
  NxInputNumber,
  NxPageHeader,
  NxTab,
  NxTabList,
  NxTabPanel,
  NxTabPanels,
  NxTabs,
  NxTextarea,
  NxToggleButton,
} from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useStoreSettings } from '../composables/useStoreSettings'

const router = useRouter()
const { notify } = useSystemAlert()
const { settingsQuery, updateMutation } = useStoreSettings()

const activeTab = ref<'tienda' | 'editor'>('tienda')

// Los mismos presets que traduce el storefront a familias concretas
// (useTheme.ts). Catálogo cerrado: fuente libre = tiendas ilegibles.


// --- Estado del formulario ---
const storeName = ref('')
const description = ref('')
const whatsappNumber = ref('')
const shippingFlatFee = ref<number | null>(0)
const minOrderAmount = ref<number | null>(0)
const pickupEnabled = ref(false)
const orderEmailEnabled = ref(true)
const orderEmail = ref('')
const terms = ref('')
const seoTitle = ref('')
const seoDescription = ref('')

const primaryColor = ref('#4f46e5')
const surfaceColor = ref('#ffffff')
const accentColor = ref('#0ea5e9')
const fontPreset = ref('moderna')

const heroEnabled = ref(false)
const heroEyebrow = ref('')
const heroTitle = ref('')
const heroHighlight = ref('')
const heroSubtitle = ref('')
const heroCtaLabel = ref('')

const trustEnabled = ref(false)
const trustItems = ref<TrustItem[]>([])

const storyEnabled = ref(false)
const storyEyebrow = ref('')
const storyTitle = ref('')
const storyBody = ref('')
const storyStats = ref<StoryStat[]>([])

const address = ref('')
const openingHours = ref('')
const instagramUrl = ref('')
const facebookUrl = ref('')

const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const settings = computed(() => settingsQuery.data.value)
const isOpen = computed(() => settings.value?.is_active === true)
const publishedCount = computed(() => settings.value?.published_products_count ?? 0)

watch(
  settings,
  (value) => {
    if (!value) {
      return
    }
    storeName.value = value.store_name ?? ''
    description.value = value.description ?? ''
    whatsappNumber.value = value.whatsapp_number ?? ''
    shippingFlatFee.value = value.shipping_flat_fee
    minOrderAmount.value = value.min_order_amount
    pickupEnabled.value = value.pickup_enabled
    orderEmailEnabled.value = value.order_email_enabled
    orderEmail.value = value.order_email ?? ''
    terms.value = value.terms ?? ''
    seoTitle.value = value.seo_title ?? ''
    seoDescription.value = value.seo_description ?? ''

    primaryColor.value = value.primary_color ?? '#4f46e5'
    surfaceColor.value = value.surface_color ?? '#ffffff'
    accentColor.value = value.accent_color ?? '#0ea5e9'
    fontPreset.value = value.font_preset ?? 'moderna'

    heroEnabled.value = value.hero_enabled
    heroEyebrow.value = value.hero_eyebrow ?? ''
    heroTitle.value = value.hero_title ?? ''
    heroHighlight.value = value.hero_highlight ?? ''
    heroSubtitle.value = value.hero_subtitle ?? ''
    heroCtaLabel.value = value.hero_cta_label ?? ''

    trustEnabled.value = value.trust_enabled
    trustItems.value = value.trust_items.map((item) => ({ ...item }))

    storyEnabled.value = value.story_enabled
    storyEyebrow.value = value.story_eyebrow ?? ''
    storyTitle.value = value.story_title ?? ''
    storyBody.value = value.story_body ?? ''
    storyStats.value = value.story_stats.map((stat) => ({ ...stat }))

    address.value = value.address ?? ''
    openingHours.value = value.opening_hours ?? ''
    instagramUrl.value = value.instagram_url ?? ''
    facebookUrl.value = value.facebook_url ?? ''
  },
  { immediate: true },
)

async function save(payload: StoreSettingsPayload, message: string): Promise<void> {
  fieldErrors.value = {}
  formError.value = null
  try {
    await updateMutation.mutateAsync(payload)
    notify(message)
  } catch (error) {
    const fields = extractFieldErrors(error)
    fieldErrors.value = fields
    // Los errores de bloques anidados (trust_items.0.title) no tienen input
    // propio: sin esto el formulario se quedaría mudo.
    if (Object.keys(fields).length === 0 || Object.keys(fields).some((key) => key.includes('.'))) {
      formError.value = extractErrorMessage(error, 'No pudimos guardar la tienda.')
    }
  }
}

const nullable = (value: string) => value.trim() || null

function saveStore(): Promise<void> {
  return save(
    {
      store_name: nullable(storeName.value),
      description: nullable(description.value),
      whatsapp_number: nullable(whatsappNumber.value),
      shipping_flat_fee: shippingFlatFee.value ?? 0,
      min_order_amount: minOrderAmount.value ?? 0,
      pickup_enabled: pickupEnabled.value,
      order_email_enabled: orderEmailEnabled.value,
      order_email: orderEmail.value.trim() || null,
      terms: nullable(terms.value),
      seo_title: nullable(seoTitle.value),
      seo_description: nullable(seoDescription.value),
      address: nullable(address.value),
      opening_hours: nullable(openingHours.value),
      instagram_url: nullable(instagramUrl.value),
      facebook_url: nullable(facebookUrl.value),
    },
    'Tienda actualizada',
  )
}



function toggleStore(): Promise<void> {
  const opening = !isOpen.value
  return save({ is_active: opening }, opening ? 'Tienda abierta al público' : 'Tienda cerrada')
}

async function copyPublicUrl(): Promise<void> {
  if (settings.value) {
    await navigator.clipboard.writeText(settings.value.public_url)
    notify('Enlace copiado')
  }
}



// La página de inicio: una lista de bloques que el comerciante ordena.
// Reemplaza a las tres ranuras fijas (portada/confianza/historia) que hacían
// que todas las tiendas Nexolú se vieran iguales.


</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Tienda online" icon="pi pi-shop" compact />

    <div v-if="settingsQuery.isPending.value" class="text-sm text-slate-400">Cargando…</div>

    <template v-else-if="settings">
      <!-- Estado -->
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="flex items-center gap-2 text-sm font-semibold text-slate-800">
              {{ isOpen ? 'Tienda abierta' : 'Tienda cerrada' }}
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                :class="isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ isOpen ? 'Visible en internet' : 'Nadie puede verla' }}
              </span>
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ publishedCount }} producto{{ publishedCount === 1 ? '' : 's' }} publicado{{ publishedCount === 1 ? '' : 's' }}.
              <button
                type="button"
                class="font-semibold text-indigo-600 hover:text-indigo-800"
                @click="router.push({ name: 'catalog.index' })"
              >
                Elegir qué se publica
              </button>
            </p>
          </div>
          <NxButton :variant="isOpen ? 'outline' : 'primary'" :loading="updateMutation.isPending.value" @click="toggleStore">
            {{ isOpen ? 'Cerrar tienda' : 'Abrir tienda' }}
          </NxButton>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <span class="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{{ settings.public_url }}</span>
          <button type="button" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800" @click="copyPublicUrl">
            Copiar
          </button>
          <a :href="settings.public_url" target="_blank" rel="noopener" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Abrir
          </a>
        </div>

        <p v-if="isOpen && publishedCount === 0" class="mt-2 text-xs text-amber-700">
          La tienda está abierta pero no hay productos publicados: quien entre no verá nada.
        </p>
      </div>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ formError }}</p>

      <NxTabs v-model:value="activeTab">
        <NxTabList>
          <NxTab value="tienda" icon="pi pi-shop">Tienda</NxTab>
          <NxTab value="editor" icon="pi pi-palette">Editor</NxTab>
        </NxTabList>

        <NxTabPanels>
          <!-- ------------------------------ TIENDA -->
          <NxTabPanel value="tienda">
            <div class="flex flex-col gap-4">
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-3 text-sm font-semibold text-slate-700">Identidad</p>
                <div class="flex flex-col gap-3">
                  <NxInput v-model="storeName" label="Nombre de la tienda" :error="fieldErrors.store_name" />
                  <p class="-mt-2 text-[11px] text-slate-400">Si lo dejas vacío se usa el nombre de tu negocio.</p>
                  <NxTextarea v-model="description" label="Descripción" :rows="2" :error="fieldErrors.description" />
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-3 text-sm font-semibold text-slate-700">Contacto y envío</p>
                <div class="flex flex-col gap-3">
                  <NxInput v-model="whatsappNumber" label="WhatsApp de atención" :error="fieldErrors.whatsapp_number" />
                  <NxInputNumber v-model="shippingFlatFee" label="Costo de envío" :min="0" :error="fieldErrors.shipping_flat_fee" />
                  <NxInputNumber v-model="minOrderAmount" label="Pedido mínimo" :min="0" :error="fieldErrors.min_order_amount" />
                  <NxToggleButton v-model="pickupEnabled" label="Permitir recoger en tienda" icon="pi pi-shop" />
                  <NxInput v-model="address" label="Dirección" :error="fieldErrors.address" />
                  <NxInput v-model="openingHours" label="Horario" :error="fieldErrors.opening_hours" />
                  <NxInput v-model="instagramUrl" label="Instagram (URL)" :error="fieldErrors.instagram_url" />
                  <NxInput v-model="facebookUrl" label="Facebook (URL)" :error="fieldErrors.facebook_url" />
                  <NxTextarea v-model="terms" label="Condiciones (opcional)" :rows="3" :error="fieldErrors.terms" />
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-1 text-sm font-semibold text-slate-700">Avisos de pedidos</p>
                <p class="mb-3 text-[11px] text-slate-400">
                  Un pedido entra sin que nadie toque el POS. El correo llega apenas se hace.
                </p>
                <div class="flex flex-col gap-3">
                  <NxToggleButton v-model="orderEmailEnabled" label="Avisarme por correo" icon="pi pi-envelope" />
                  <NxInput
                    v-model="orderEmail"
                    label="Correo para pedidos (opcional)"
                    :disabled="!orderEmailEnabled"
                    :error="fieldErrors.order_email"
                  />
                  <p class="text-[11px] text-slate-400">Vacío: llega al correo del dueño.</p>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-1 text-sm font-semibold text-slate-700">Buscadores</p>
                <p class="mb-3 text-[11px] text-slate-400">Cómo aparece en Google. Vacío = se usa el nombre y la descripción.</p>
                <div class="flex flex-col gap-3">
                  <NxInput v-model="seoTitle" label="Título" :error="fieldErrors.seo_title" />
                  <NxInput v-model="seoDescription" label="Descripción" :error="fieldErrors.seo_description" />
                </div>
              </div>

              <NxButton :loading="updateMutation.isPending.value" @click="saveStore">Guardar</NxButton>
            </div>
          </NxTabPanel>
          <!-- ------------------------------ APARIENCIA -->
          <NxTabPanel value="editor">
            <div class="mt-3 rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p class="text-3xl">🎨</p>
              <p class="mt-2 text-sm font-semibold text-slate-800">El editor de tu tienda</p>
              <p class="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Arma tu pagina de inicio viendo la tienda en vivo mientras la editas: bloques,
                plantillas, colores, tipografia y tu marca.
              </p>

              <NxButton class="mt-4" icon="pi pi-pencil" @click="router.push({ name: 'online-store.editor' })">
                Abrir el editor
              </NxButton>

              <p class="mt-3 text-[11px] text-slate-400">
                Se abre a pantalla completa. Funciona mejor en computador o tablet.
              </p>
            </div>
          </NxTabPanel>
        </NxTabPanels>
      </NxTabs>
    </template>
  </div>
</template>
