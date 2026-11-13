<script setup lang="ts">
// Menú digital del restaurante: la carta en internet (QR para las mesas y
// enlace para WhatsApp) y, si el restaurante quiere, pedidos a domicilio o
// para recoger que llegan a Pedidos online y a la comandera.
//
// Es un módulo aparte de la Tienda online a propósito: un restaurante no
// tiene una "tienda". Por dentro usa el mismo motor (productos publicados,
// carrito, pedidos), así que guarda en los mismos ajustes (store-settings).
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import PublicProfileCard from '@/modules/link-page/components/PublicProfileCard.vue'
import BusinessOrderCharges from '@/modules/online-store/components/BusinessOrderCharges.vue'
import ShareLinkPanel from '@/modules/online-store/components/ShareLinkPanel.vue'
import { useStoreSettings } from '@/modules/online-store/composables/useStoreSettings'
import { BRAND_SWATCHES } from '@/modules/online-store/support/themeSwatches'
import type { StoreSettingsPayload } from '@/types/store'
import {
  NxButton,
  NxColorPicker,
  NxInput,
  NxInputNumber,
  NxPageHeader,
  NxTextarea,
  NxToggleButton,
} from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { hasFeature } from '@/utils/hasFeature'

const router = useRouter()
const { notify } = useSystemAlert()
const { data: business } = useBusiness()
const { settingsQuery, updateMutation } = useStoreSettings()
const settings = computed(() => settingsQuery.data.value)

const isPublished = computed(() => settings.value?.is_active === true)
const takesOrders = computed(() => settings.value?.menu_mode !== true)
const dishes = computed(() => settings.value?.published_products_count ?? 0)
const hasKitchen = computed(() => hasFeature(business.value, 'kitchen_board'))

// --- Formulario (se guarda con el botón) ---
const minOrder = ref<number | null>(0)
const pickupEnabled = ref(true)
const deliveryEstimate = ref('')
const shippingNote = ref('')
const address = ref('')
const openingHours = ref('')
const primaryColor = ref('#4f46e5')
const fieldErrors = ref<Record<string, string>>({})

watch(
  settings,
  (value) => {
    if (!value) {
      return
    }
    minOrder.value = value.min_order_amount
    pickupEnabled.value = value.pickup_enabled
    deliveryEstimate.value = value.delivery_estimate ?? ''
    shippingNote.value = value.shipping_note ?? ''
    address.value = value.address ?? ''
    openingHours.value = value.opening_hours ?? ''
    primaryColor.value = value.primary_color ?? '#4f46e5'
  },
  { immediate: true },
)

async function save(payload: StoreSettingsPayload, message: string): Promise<boolean> {
  fieldErrors.value = {}
  try {
    await updateMutation.mutateAsync(payload)
    notify(message, 'success')
    return true
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    if (Object.keys(fieldErrors.value).length === 0) {
      notify(extractErrorMessage(error, 'No pudimos guardar el menú.'), 'error')
    }
    return false
  }
}

const nullable = (value: string) => value.trim() || null

function togglePublished(): void {
  const publishing = !isPublished.value
  void save(
    { is_active: publishing },
    publishing ? 'Tu menú ya está en internet' : 'Menú apagado: nadie puede verlo',
  )
}

function setTakesOrders(value: boolean): void {
  if (value === takesOrders.value) {
    return
  }
  void save(
    { menu_mode: !value },
    value ? 'Tu menú ahora recibe pedidos' : 'Tu menú ahora solo se muestra',
  )
}

function saveDetails(): void {
  void save(
    {
      min_order_amount: minOrder.value ?? 0,
      pickup_enabled: pickupEnabled.value,
      delivery_estimate: nullable(deliveryEstimate.value),
      shipping_note: nullable(shippingNote.value),
      address: nullable(address.value),
      opening_hours: nullable(openingHours.value),
      primary_color: primaryColor.value,
    },
    'Menú actualizado',
  )
}

const shareText = computed(
  () => `Mira nuestro menú${takesOrders.value ? ' y haz tu pedido' : ''}:`,
)
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader
      title="Menú digital"
      subtitle="Tu carta en internet: para el QR de las mesas y para compartir por WhatsApp."
      icon="pi pi-book"
      compact
    />

    <div v-if="settingsQuery.isPending.value" class="text-sm text-slate-400">Cargando…</div>

    <template v-else-if="settings">
      <!-- Estado -->
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800">
              {{ isPublished ? 'Tu menú está publicado' : 'Tu menú está apagado' }}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {{ dishes }} plato{{ dishes === 1 ? '' : 's' }} en el menú.
              <button
                type="button"
                class="font-semibold text-indigo-600 hover:text-indigo-800"
                @click="router.push({ name: 'catalog.index' })"
              >
                Elegir qué platos salen
              </button>
            </p>
          </div>
          <NxButton
            :variant="isPublished ? 'outline' : 'primary'"
            :loading="updateMutation.isPending.value"
            @click="togglePublished"
          >
            {{ isPublished ? 'Apagar menú' : 'Publicar menú' }}
          </NxButton>
        </div>

        <p v-if="isPublished && dishes === 0" class="mt-2 text-xs text-amber-700">
          El menú está publicado pero no tiene platos: en Catálogo, toca «Publicar» en los que quieres
          mostrar.
        </p>
        <p v-if="!isPublished" class="mt-3 text-sm text-slate-600">
          Al publicarlo tienes un enlace y un <strong>QR</strong> con tus platos, fotos y precios al
          día. Lo pones en las mesas o lo mandas por WhatsApp, y cuando cambias un precio en el POS
          cambia solo en el menú.
        </p>

        <div v-if="isPublished" class="mt-4 border-t border-slate-100 pt-4">
          <ShareLinkPanel :url="settings.menu_url" :share-text="shareText" qr-file-name="qr-menu" />
          <a
            :href="settings.menu_url"
            target="_blank"
            rel="noopener"
            class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Ver mi menú
            <i class="pi pi-external-link text-[10px]" />
          </a>
        </div>
      </div>

      <!-- Cómo se usa -->
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-sm font-semibold text-slate-800">¿Cómo lo vas a usar?</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Uso del menú">
          <button
            v-for="option in [
              {
                value: false,
                title: 'Solo mostrar el menú',
                hint: 'Tus clientes ven platos y precios. Ideal para el QR de las mesas.',
                icon: 'pi pi-book',
              },
              {
                value: true,
                title: 'Recibir pedidos',
                hint: 'A domicilio o para recoger. Te avisamos por WhatsApp.',
                icon: 'pi pi-shopping-bag',
              },
            ]"
            :key="option.title"
            type="button"
            role="radio"
            :aria-checked="takesOrders === option.value"
            class="flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors"
            :class="
              takesOrders === option.value
                ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                : 'border-slate-200 hover:border-indigo-300'
            "
            :disabled="updateMutation.isPending.value"
            @click="setTakesOrders(option.value)"
          >
            <i
              class="mt-0.5"
              :class="[option.icon, takesOrders === option.value ? 'text-indigo-600' : 'text-slate-400']"
            />
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-slate-800">{{ option.title }}</span>
              <span class="block text-xs text-slate-500">{{ option.hint }}</span>
            </span>
          </button>
        </div>

        <p v-if="takesOrders" class="mt-3 text-xs text-slate-500">
          Los pedidos llegan a
          <button
            type="button"
            class="font-semibold text-indigo-600 hover:text-indigo-800"
            @click="router.push({ name: 'online-store.orders' })"
          >
            Pedidos online</button
          >.
          <template v-if="hasKitchen">
            Al confirmarlos se registra la venta y pasan a la comandera; desde ahí los despachas.
          </template>
          <template v-else>Al confirmarlos se registran como venta.</template>
          Al cliente le escribes desde tu WhatsApp con el botón del pedido.
        </p>
      </div>

      <!-- Domicilios -->
      <div v-if="takesOrders" class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm font-semibold text-slate-800">Domicilios y para recoger</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BusinessOrderCharges />
          <NxInputNumber
            v-model="minOrder"
            label="Pedido mínimo"
            :min="0"
            currency
            :error="fieldErrors.min_order_amount"
          />
          <NxInput
            v-model="deliveryEstimate"
            label="Tiempo de entrega"
            placeholder="30 a 45 minutos"
            :error="fieldErrors.delivery_estimate"
          />
          <NxInput
            v-model="shippingNote"
            label="Cómo explicas el domicilio"
            placeholder="Domicilio gratis en el centro"
            :error="fieldErrors.shipping_note"
          />
        </div>
        <NxToggleButton
          v-model="pickupEnabled"
          class="mt-3"
          label="También para recoger en el local"
          icon="pi pi-shop"
        />
      </div>

      <!-- Datos del restaurante -->
      <PublicProfileCard />

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm font-semibold text-slate-800">Dirección, horario y color</p>
        <div class="flex flex-col gap-3">
          <NxInput v-model="address" label="Dirección" :error="fieldErrors.address" />
          <NxTextarea
            v-model="openingHours"
            label="Horario"
            :rows="2"
            placeholder="Lun-Dom 12:00-22:00"
            :error="fieldErrors.opening_hours"
          />
          <NxColorPicker
            v-model="primaryColor"
            label="Color de tu menú"
            :swatches="BRAND_SWATCHES"
          />
        </div>
      </div>

      <NxButton class="self-start" :loading="updateMutation.isPending.value" @click="saveDetails">
        Guardar cambios
      </NxButton>
    </template>
  </div>
</template>
