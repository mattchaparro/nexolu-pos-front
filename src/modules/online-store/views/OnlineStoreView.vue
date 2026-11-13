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

import { useBranches } from '@/composables/useBranches'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { StoreSettingsPayload, StoryStat, TrustItem } from '@/types/store'
import {
  NxButton,
  NxInput,
  NxInputNumber,
  NxPageHeader,
  NxSelect,
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

import PublicProfileCard from '@/modules/link-page/components/PublicProfileCard.vue'

import ShareCatalogModal from '../components/ShareCatalogModal.vue'
import { useStoreSettings } from '../composables/useStoreSettings'

const router = useRouter()
const { notify } = useSystemAlert()

// null primero y explicito: "la principal" es lo que significa no haber
// elegido, y esconderlo obligaria al comerciante a fijar una sede para poder
// volver atras.
const fulfillmentOptions = computed(() => [
  { label: 'Sede principal', value: null },
  ...branches.value.map((branch) => ({ label: branch.name, value: branch.id })),
])
const { settingsQuery, updateMutation } = useStoreSettings()
const { branches, hasMultipleBranches } = useBranches()

const activeTab = ref<'tienda' | 'editor'>('tienda')

// Los mismos presets que traduce el storefront a familias concretas
// (useTheme.ts). Catálogo cerrado: fuente libre = tiendas ilegibles.

// --- Estado del formulario ---
const shippingFlatFee = ref<number | null>(0)
const minOrderAmount = ref<number | null>(0)
// Cuanto se demora en llegar. Texto libre y no un numero de dias: un
// restaurante que despacha en 40 minutos y una tienda que envia por
// transportadora no caben en la misma unidad.
const deliveryEstimate = ref('')
// Como se explica el envio. Vive junto al COSTO y no dentro de cada bloque:
// las plantillas lo citan con {envio}, asi que se edita una vez y cambia en
// toda la tienda.
const shippingNote = ref('')
const pickupEnabled = ref(false)
const menuMode = ref(false)
const fulfillmentBranchId = ref<number | null>(null)
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
    shippingFlatFee.value = value.shipping_flat_fee
    minOrderAmount.value = value.min_order_amount
    deliveryEstimate.value = value.delivery_estimate ?? ''
    shippingNote.value = value.shipping_note ?? ''
    pickupEnabled.value = value.pickup_enabled
    menuMode.value = value.menu_mode
    fulfillmentBranchId.value = value.fulfillment_branch_id
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
      shipping_flat_fee: shippingFlatFee.value ?? 0,
      min_order_amount: minOrderAmount.value ?? 0,
      delivery_estimate: deliveryEstimate.value.trim() || null,
      shipping_note: shippingNote.value.trim() || null,
      pickup_enabled: pickupEnabled.value,
      menu_mode: menuMode.value,
      ...(hasMultipleBranches.value ? { fulfillment_branch_id: fulfillmentBranchId.value } : {}),
      order_email_enabled: orderEmailEnabled.value,
      order_email: orderEmail.value.trim() || null,
      terms: nullable(terms.value),
      seo_title: nullable(seoTitle.value),
      seo_description: nullable(seoDescription.value),
      address: nullable(address.value),
      opening_hours: nullable(openingHours.value),
    },
    'Tienda actualizada',
  )
}

function toggleStore(): Promise<void> {
  const opening = !isOpen.value
  return save({ is_active: opening }, opening ? 'Tienda abierta al público' : 'Tienda cerrada')
}

// Ventana de compartir el catálogo (enlace, WhatsApp, QR).
const shareOpen = ref(false)

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
              {{ publishedCount }} producto{{ publishedCount === 1 ? '' : 's' }} publicado{{
                publishedCount === 1 ? '' : 's'
              }}.
              <button
                type="button"
                class="font-semibold text-indigo-600 hover:text-indigo-800"
                @click="router.push({ name: 'catalog.index' })"
              >
                Elegir qué se publica
              </button>
            </p>
          </div>
          <NxButton
            :variant="isOpen ? 'outline' : 'primary'"
            :loading="updateMutation.isPending.value"
            @click="toggleStore"
          >
            {{ isOpen ? 'Cerrar tienda' : 'Abrir tienda' }}
          </NxButton>
        </div>

        <!-- Compartir, compacto: el QR y los botones viven en la ventana de
             compartir y en «Compartir mi negocio», no ocupando esta pantalla. -->
        <div v-if="isOpen" class="mt-3 flex flex-wrap items-center gap-2">
          <NxButton size="sm" icon="pi pi-share-alt" @click="shareOpen = true">
            Compartir catálogo
          </NxButton>
          <NxButton
            size="sm"
            variant="outline"
            icon="pi pi-link"
            @click="router.push({ name: 'share-business.index' })"
          >
            Mis enlaces
          </NxButton>
          <a
            :href="settings.public_url"
            target="_blank"
            rel="noopener"
            class="ml-auto flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Ver mi tienda
            <i class="pi pi-external-link text-[10px]" />
          </a>
        </div>

        <p v-if="isOpen && publishedCount === 0" class="mt-2 text-xs text-amber-700">
          La tienda está abierta pero no hay productos publicados: quien entre no verá nada.
        </p>
        <p v-if="!isOpen" class="mt-3 text-sm text-slate-600">
          Al abrirla tienes un <strong>catálogo virtual</strong> con tus productos, precios y fotos
          al día, para mandar por WhatsApp, poner en Instagram o imprimir en un QR. Tus clientes te
          dejan el pedido ahí mismo y te llega a <strong>Pedidos online</strong>; si no tienes
          pasarela de pago, tú los contactas para cobrar.
        </p>
      </div>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ formError }}
      </p>

      <NxTabs v-model:value="activeTab">
        <NxTabList>
          <NxTab value="tienda" icon="pi pi-shop">Tienda</NxTab>
          <NxTab value="editor" icon="pi pi-palette">Editor</NxTab>
        </NxTabList>

        <NxTabPanels>
          <!-- ------------------------------ TIENDA -->
          <NxTabPanel value="tienda">
            <div class="flex flex-col gap-4">
              <!-- Nombre, logo, WhatsApp y redes: el perfil público del negocio. Se
                   edita en un solo lugar y la tienda lo lee de ahí. -->
              <PublicProfileCard />

              <!-- Un restaurante puede querer solo mostrar la carta (QR en las mesas)
                   y atender por su cuenta, sin recibir pedidos por internet. -->
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-1 text-sm font-semibold text-slate-700">Pedidos</p>
                <p class="mb-3 text-[11px] text-slate-400">
                  Tus clientes ven tus productos, fotos y precios, pero no pueden pedir por aquí.
                  Ideal para el QR de las mesas.
                </p>
                <NxToggleButton
                  v-model="menuMode"
                  label="Solo mostrar el menú (sin pedidos)"
                  icon="pi pi-book"
                />
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-3 text-sm font-semibold text-slate-700">Envío y dirección</p>
                <div class="flex flex-col gap-3">
                  <p v-if="settings.whatsapp_number" class="text-xs text-slate-500">
                    <template v-if="settings.whatsapp_clicks_30d > 0">
                      {{ settings.whatsapp_clicks_30d }}
                      {{
                        settings.whatsapp_clicks_30d === 1
                          ? 'persona escribió'
                          : 'personas escribieron'
                      }}
                      a tu WhatsApp desde la tienda en los últimos 30 días.
                    </template>
                    <template v-else>
                      Todavía nadie te ha escrito por WhatsApp desde la tienda este mes.
                    </template>
                  </p>
                  <NxInputNumber
                    v-model="shippingFlatFee"
                    label="Costo de envío"
                    :min="0"
                    :error="fieldErrors.shipping_flat_fee"
                  />
                  <NxInputNumber
                    v-model="minOrderAmount"
                    label="Pedido mínimo"
                    :min="0"
                    :error="fieldErrors.min_order_amount"
                  />
                  <NxInput
                    v-model="shippingNote"
                    label="Cómo explicas el envío"
                    placeholder="Envío gratis en Bogotá desde $50.000"
                    :error="fieldErrors.shipping_note"
                  />
                  <NxInput
                    v-model="deliveryEstimate"
                    label="Tiempo de entrega"
                    placeholder="2 a 3 días hábiles"
                    :error="fieldErrors.delivery_estimate"
                  />
                  <p
                    class="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500"
                  >
                    Estos dos datos los puedes citar dentro de los textos de tu página escribiendo
                    <code class="font-mono text-slate-700">{envio}</code> y
                    <code class="font-mono text-slate-700">{entrega}</code>. Las plantillas ya los
                    usan: los cambias aquí una vez y cambian en toda la tienda. También sirven
                    <code class="font-mono text-slate-700">{tienda}</code> y
                    <code class="font-mono text-slate-700">{minimo}</code>.
                  </p>
                  <NxToggleButton
                    v-model="pickupEnabled"
                    label="Permitir recoger en tienda"
                    icon="pi pi-shop"
                  />
                  <!-- Solo con multisede: define de que inventario vende la
                       tienda y de donde sale la mercancia. -->
                  <template v-if="hasMultipleBranches">
                    <NxSelect
                      v-model="fulfillmentBranchId"
                      label="Sede que despacha"
                      :options="fulfillmentOptions"
                      option-label="label"
                      option-value="value"
                      :error="fieldErrors.fulfillment_branch_id"
                    />
                    <p class="-mt-1 text-xs text-slate-500">
                      La tienda muestra el stock y los precios de esta sede, y de ahí sale lo que se
                      despacha.
                    </p>
                  </template>
                  <NxInput v-model="address" label="Dirección" :error="fieldErrors.address" />
                  <NxInput
                    v-model="openingHours"
                    label="Horario"
                    :error="fieldErrors.opening_hours"
                  />
                  <NxTextarea
                    v-model="terms"
                    label="Condiciones (opcional)"
                    :rows="3"
                    :error="fieldErrors.terms"
                  />
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-1 text-sm font-semibold text-slate-700">Avisos de pedidos</p>
                <p class="mb-3 text-[11px] text-slate-400">
                  Un pedido entra sin que nadie toque el POS. El correo llega apenas se hace.
                </p>
                <div class="flex flex-col gap-3">
                  <NxToggleButton
                    v-model="orderEmailEnabled"
                    label="Avisarme por correo"
                    icon="pi pi-envelope"
                  />
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
                <p class="mb-3 text-[11px] text-slate-400">
                  Cómo aparece en Google. Vacío = se usa el nombre y la descripción.
                </p>
                <div class="flex flex-col gap-3">
                  <NxInput v-model="seoTitle" label="Título" :error="fieldErrors.seo_title" />
                  <NxInput
                    v-model="seoDescription"
                    label="Descripción"
                    :error="fieldErrors.seo_description"
                  />
                </div>
              </div>

              <NxButton :loading="updateMutation.isPending.value" @click="saveStore"
                >Guardar</NxButton
              >
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

              <NxButton
                class="mt-4"
                icon="pi pi-pencil"
                @click="router.push({ name: 'online-store.editor' })"
              >
                Abrir el editor
              </NxButton>

              <p class="mt-3 text-[11px] text-slate-400">
                Se abre a pantalla completa. Funciona mejor en computador o tablet.
              </p>
            </div>
          </NxTabPanel>
        </NxTabPanels>
      </NxTabs>

      <ShareCatalogModal v-if="shareOpen" v-model="shareOpen" initial-target="catalog" />
    </template>
  </div>
</template>
