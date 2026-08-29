<script setup lang="ts">
// Puerto de Admin/Settings/Index.vue del legacy, organizado en pestañas en
// vez de una sola pagina larga. Cada pestaña guarda con el mismo
// PUT /business (o su endpoint dedicado para notificaciones/snooze) - no
// hay un "guardar todo" global, igual que las demas pantallas de este app.
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

import { useBusiness } from '@/composables/useBusiness'
import { useBusinessPaymentMethods } from '@/composables/useBusinessPaymentMethods'
import { useClearLowStockSnoozeMutation } from '@/composables/useClearLowStockSnoozeMutation'
import { useRequestPaymentMethodSupportMutation } from '@/composables/useRequestPaymentMethodSupportMutation'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useUpdateBusinessMutation } from '@/composables/useUpdateBusinessMutation'
import { useUpdateBusinessNotificationsMutation } from '@/composables/useUpdateBusinessNotificationsMutation'
import { useUpdateBusinessPaymentMethodsMutation } from '@/composables/useUpdateBusinessPaymentMethodsMutation'
import { useWhatsappLinkStatus } from '@/composables/useWhatsappLinkStatus'
import { useAiMessagePackCheckout } from '@/modules/ai-message-packs/composables/useAiMessagePackCheckout'
import { useAiQuotaState } from '@/modules/ai-message-packs/composables/useAiQuotaState'
import { useCategories } from '@/modules/catalog/composables/useCategories'
import {
  NxButton,
  NxCard,
  NxInput,
  NxInputNumber,
  NxModal,
  NxPageHeader,
  NxSelect,
  NxSwitch,
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
import { formatCop } from '@/utils/formatCop'

import PaymentGatewayCard from '../components/PaymentGatewayCard.vue'
import { usePaymentGateways } from '../composables/usePaymentGateways'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { data: business, isPending } = useBusiness()
const { notify } = useSystemAlert()

const canEdit = computed(() => auth.user?.is_business_owner === true || auth.user?.roles?.includes('admin') === true)

const activeTab = ref('0')

// ---------- Negocio ----------------------------------------------------
const negocio = reactive({
  name: '',
  owner_name: '',
  phone: '',
  nit: '',
  address: '',
  whatsapp_number: '',
  instagram_handle: '',
  tiktok_handle: '',
})
const negocioErrors = ref<Record<string, string>>({})
const negocioFormError = ref<string | null>(null)

// ---------- Facturacion y tickets --------------------------------------
const facturacion = reactive({
  invoice_prefix: '',
  ticket_paper_width: '80' as '58' | '80',
  ticket_header_tagline: '',
  ticket_thanks_message: '',
  ticket_footer_text: '',
  email_header_color: '#0369a1',
  email_footer_text: '',
  email_whatsapp_cta: false,
})
const facturacionErrors = ref<Record<string, string>>({})
const facturacionFormError = ref<string | null>(null)
const paperWidthOptions = [
  { label: '80mm (estandar)', value: '80' },
  { label: '58mm (mini)', value: '58' },
]

// ---------- Ventas: metodos de pago, domicilios, cargos ----------------
// Selector contra el catalogo global (PosPaymentMethod, gestionado desde
// SuperAdmin) en vez de texto libre - ver PosPaymentMethodController en el
// backend. Guardar aca es lo que migra al negocio del JSON legacy al
// catalogo normalizado (Business::paymentMethods()); nunca se borra un
// medio, solo se deshabilita.
const paymentMethodsQuery = useBusinessPaymentMethods()
const paymentMethodSelections = reactive<Record<number, boolean>>({})
const paymentMethodsFormError = ref<string | null>(null)
const updatePaymentMethods = useUpdateBusinessPaymentMethodsMutation()

watch(
  paymentMethodsQuery.data,
  (value) => {
    if (!value) {
      return
    }
    for (const key of Object.keys(paymentMethodSelections)) {
      delete paymentMethodSelections[Number(key)]
    }
    for (const method of value.data) {
      paymentMethodSelections[method.id] = method.is_enabled
    }
  },
  { immediate: true },
)

async function savePaymentMethods(): Promise<void> {
  paymentMethodsFormError.value = null
  try {
    await updatePaymentMethods.mutateAsync(
      Object.entries(paymentMethodSelections).map(([id, is_enabled]) => ({
        pos_payment_method_id: Number(id),
        is_enabled,
      })),
    )
    notify('Medios de pago guardados')
  } catch (error) {
    paymentMethodsFormError.value = extractErrorMessage(error, 'No pudimos guardar los medios de pago.')
  }
}

// ---------- Ventas: "no esta el que necesitas? Contacta a soporte" ------
const supportModalOpen = ref(false)
const supportMessage = ref('')
const requestSupport = useRequestPaymentMethodSupportMutation()

async function submitSupportRequest(): Promise<void> {
  if (!supportMessage.value.trim()) {
    return
  }
  try {
    await requestSupport.mutateAsync(supportMessage.value.trim())
    notify('Le avisamos a soporte, te contactaremos pronto')
    supportModalOpen.value = false
    supportMessage.value = ''
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos enviar la solicitud.'))
  }
}

const ventas = reactive({
  delivery_enabled: false,
  delivery_fee: 0 as number | null,
  service_charge_enabled: false,
  service_charge_rate: 10 as number | null,
  ipoconsumo_enabled: false,
  ipoconsumo_rate: 8 as number | null,
})
const ventasErrors = ref<Record<string, string>>({})
const ventasFormError = ref<string | null>(null)

// ---------- Inventario: alertas de stock bajo ---------------------------
const inventario = reactive({
  low_stock_alert_threshold: 5 as number | null,
  low_stock_email_enabled: false,
  low_stock_email: '',
})
const inventarioErrors = ref<Record<string, string>>({})
const inventarioFormError = ref<string | null>(null)
const clearSnooze = useClearLowStockSnoozeMutation()
const snoozedUntilLabel = computed(() => {
  const until = business.value?.low_stock_snoozed_until
  if (!until) {
    return null
  }
  const date = new Date(until)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
})

async function reactivateAlerts(): Promise<void> {
  try {
    await clearSnooze.mutateAsync()
    notify('Alertas de inventario reactivadas')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos reactivar las alertas.'))
  }
}

// ---------- Apartados: categorias permitidas -----------------------------
const categoriesQuery = useCategories()
const layawayAllCategories = ref(true)
const layawaySelectedCategoryIds = ref<number[]>([])

function toggleLayawayCategory(id: number): void {
  layawaySelectedCategoryIds.value = layawaySelectedCategoryIds.value.includes(id)
    ? layawaySelectedCategoryIds.value.filter((c) => c !== id)
    : [...layawaySelectedCategoryIds.value, id]
}

// ---------- Ordenes de servicio ------------------------------------------
const showCatalog = ref(true)
const defaultServiceName = ref('')

// ---------- Notificaciones por WhatsApp -----------------------------------
// schedulable: ademas del on/off, el negocio puede elegir A QUE HORA le
// llega (ver NotificationTypes::SCHEDULABLE en nexolu-pos-api) - recordatorios
// no aplica (cada recordatorio ya trae su propia hora, no hay "una hora" de
// negocio que fijar) ni fiados_vencidos (todavia no existe un comando que lo
// envie).
const NOTIFICATION_TYPES = [
  { key: 'resumen_diario', label: 'Resumen del dia', desc: 'Cada noche: cuanto vendiste, como quedo la caja y lo importante del dia.', schedulable: true },
  { key: 'inventario_bajo', label: 'Inventario bajo', desc: 'Cuando un producto esta por agotarse, para que puedas reponer a tiempo.', schedulable: true },
  { key: 'recordatorios', label: 'Recordatorios y citas', desc: 'Tus recordatorios del planificador y las citas del dia.', schedulable: false },
  { key: 'fiados_vencidos', label: 'Fiados vencidos', desc: 'Cuando un fiado pasa su fecha de pago.', schedulable: false },
] as const
const notificationPrefs = reactive<Record<string, boolean>>({})
const notificationSchedule = reactive<Record<string, string>>({})
const whatsappLinkStatus = useWhatsappLinkStatus()
const whatsappLinked = computed(() => whatsappLinkStatus.data.value?.linked === true)
const updateNotifications = useUpdateBusinessNotificationsMutation()
const notificationsSaving = ref(false)

async function saveNotifications(): Promise<void> {
  notificationsSaving.value = true
  try {
    await updateNotifications.mutateAsync({ preferences: { ...notificationPrefs }, schedule: { ...notificationSchedule } })
    notify('Preferencias de notificaciones guardadas')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar las preferencias.'))
  } finally {
    notificationsSaving.value = false
  }
}

// ---------- Sincronizar formularios cuando llega el negocio --------------
watch(
  business,
  (value) => {
    if (!value) {
      return
    }
    negocio.name = value.name
    negocio.owner_name = value.owner_name
    negocio.phone = value.phone ?? ''
    negocio.nit = value.nit ?? ''
    negocio.address = value.address ?? ''
    negocio.whatsapp_number = value.whatsapp_number ?? ''
    negocio.instagram_handle = value.instagram_handle ?? ''
    negocio.tiktok_handle = value.tiktok_handle ?? ''

    facturacion.invoice_prefix = value.invoice_prefix
    facturacion.ticket_paper_width = value.ticket_paper_width
    facturacion.ticket_header_tagline = value.ticket_header_tagline ?? ''
    facturacion.ticket_thanks_message = value.ticket_thanks_message ?? ''
    facturacion.ticket_footer_text = value.ticket_footer_text ?? ''
    facturacion.email_header_color = value.email_header_color ?? '#0369a1'
    facturacion.email_footer_text = value.email_footer_text ?? ''
    facturacion.email_whatsapp_cta = value.email_whatsapp_cta

    ventas.delivery_enabled = value.delivery_enabled
    ventas.delivery_fee = value.delivery_fee
    ventas.service_charge_enabled = value.charges.service_charge_enabled
    ventas.service_charge_rate = value.charges.service_charge_rate
    ventas.ipoconsumo_enabled = value.charges.ipoconsumo_enabled
    ventas.ipoconsumo_rate = value.charges.ipoconsumo_rate

    inventario.low_stock_alert_threshold = value.low_stock_alert_threshold
    inventario.low_stock_email_enabled = value.low_stock_email_enabled
    inventario.low_stock_email = value.low_stock_email ?? ''

    layawayAllCategories.value = value.layaway_allowed_category_ids === null
    layawaySelectedCategoryIds.value = value.layaway_allowed_category_ids ?? []

    showCatalog.value = value.service_orders_show_catalog
    defaultServiceName.value = value.service_orders_default_service_name ?? ''

    const prefs = value.notification_preferences ?? {}
    for (const type of NOTIFICATION_TYPES) {
      notificationPrefs[type.key] = Boolean(prefs[type.key])
      if (type.schedulable) {
        notificationSchedule[type.key] = value.notification_schedule[type.key]
      }
    }
  },
  { immediate: true },
)

const quotaQuery = useAiQuotaState()
const quota = computed(() => quotaQuery.data.value ?? null)
const quotaUsedPercent = computed(() => {
  if (!quota.value || quota.value.applicable_quota <= 0) {
    return 0
  }
  return Math.min(100, Math.round((quota.value.consumed_this_month / quota.value.applicable_quota) * 100))
})

const packCheckout = useAiMessagePackCheckout()

async function buyPack(): Promise<void> {
  if (!auth.user || !quota.value) {
    return
  }
  await packCheckout.pay({ email: auth.user.email, fullName: auth.user.full_name }, quota.value.pack_balance)
}

onMounted(() => {
  // Fallback de navegacion (mobile): Wompi redirigio de vuelta con
  // ?wompi_pack_paid=1 en vez de solo devolver el resultado al callback del widget.
  if (route.query.wompi_pack_paid === '1') {
    packCheckout.resumePollingFromRedirect()
    router.replace({ query: {} })
  }
})

onUnmounted(() => packCheckout.stop())

const { mutateAsync, isPending: isSaving } = useUpdateBusinessMutation()

async function submitNegocio(): Promise<void> {
  negocioErrors.value = {}
  negocioFormError.value = null
  try {
    await mutateAsync({
      name: negocio.name.trim(),
      owner_name: negocio.owner_name.trim(),
      phone: negocio.phone.trim() || null,
      nit: negocio.nit.trim() || null,
      address: negocio.address.trim() || null,
      whatsapp_number: negocio.whatsapp_number.trim() || null,
      instagram_handle: negocio.instagram_handle.trim() || null,
      tiktok_handle: negocio.tiktok_handle.trim() || null,
    })
    notify('Datos del negocio guardados')
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      negocioErrors.value = fields
    } else {
      negocioFormError.value = extractErrorMessage(error, 'No pudimos guardar los datos del negocio.')
    }
  }
}

async function submitFacturacion(): Promise<void> {
  facturacionErrors.value = {}
  facturacionFormError.value = null
  try {
    await mutateAsync({
      invoice_prefix: facturacion.invoice_prefix.trim() || undefined,
      ticket_paper_width: facturacion.ticket_paper_width,
      ticket_header_tagline: facturacion.ticket_header_tagline.trim() || null,
      ticket_thanks_message: facturacion.ticket_thanks_message.trim() || null,
      ticket_footer_text: facturacion.ticket_footer_text.trim() || null,
      email_header_color: facturacion.email_header_color.trim() || null,
      email_footer_text: facturacion.email_footer_text.trim() || null,
      email_whatsapp_cta: facturacion.email_whatsapp_cta,
    })
    notify('Facturacion y tickets guardados')
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      facturacionErrors.value = fields
    } else {
      facturacionFormError.value = extractErrorMessage(error, 'No pudimos guardar la configuracion.')
    }
  }
}

async function submitVentas(): Promise<void> {
  ventasErrors.value = {}
  ventasFormError.value = null
  try {
    await mutateAsync({
      delivery_enabled: ventas.delivery_enabled,
      delivery_fee: ventas.delivery_fee ?? 0,
      service_charge_enabled: ventas.service_charge_enabled,
      service_charge_rate: ventas.service_charge_rate ?? 0,
      ipoconsumo_enabled: ventas.ipoconsumo_enabled,
      ipoconsumo_rate: ventas.ipoconsumo_rate ?? 0,
    })
    notify('Configuracion de ventas guardada')
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      ventasErrors.value = fields
    } else {
      ventasFormError.value = extractErrorMessage(error, 'No pudimos guardar la configuracion de ventas.')
    }
  }
}

async function submitInventario(): Promise<void> {
  inventarioErrors.value = {}
  inventarioFormError.value = null
  try {
    await mutateAsync({
      low_stock_alert_threshold: inventario.low_stock_alert_threshold ?? 0,
      low_stock_email_enabled: inventario.low_stock_email_enabled,
      low_stock_email: inventario.low_stock_email.trim() || null,
    })
    notify('Alertas de inventario guardadas')
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      inventarioErrors.value = fields
    } else {
      inventarioFormError.value = extractErrorMessage(error, 'No pudimos guardar las alertas de inventario.')
    }
  }
}

async function submitApartados(): Promise<void> {
  try {
    await mutateAsync({
      layaway_allowed_category_ids: layawayAllCategories.value ? null : layawaySelectedCategoryIds.value,
    })
    notify('Categorias de apartados guardadas')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar las categorias.'))
  }
}

async function submitServicios(): Promise<void> {
  try {
    await mutateAsync({
      service_orders_show_catalog: showCatalog.value,
      service_orders_default_service_name: defaultServiceName.value.trim() || null,
    })
    notify('Ajustes de ordenes de servicio guardados')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar los ajustes.'))
  }
}

const { gatewaysQuery } = usePaymentGateways()
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Ajustes" icon="pi pi-cog" compact />

    <div v-if="isPending" class="h-96 animate-pulse rounded-xl bg-slate-100" />

    <template v-else>
      <NxTabs v-model:value="activeTab">
        <NxTabList>
          <NxTab value="0">Negocio</NxTab>
          <NxTab value="1">Facturacion</NxTab>
          <NxTab value="2">Ventas</NxTab>
          <NxTab value="8">Medios de pago</NxTab>
          <NxTab value="3">Inventario</NxTab>
          <NxTab v-if="business?.can_access_layaways" value="4">Apartados</NxTab>
          <NxTab v-if="business?.can_access_services" value="5">Ordenes de servicio</NxTab>
          <NxTab value="6">Notificaciones</NxTab>
          <NxTab value="7">Asistente de IA</NxTab>
        </NxTabList>

        <NxTabPanels>
          <!-- ================= Negocio ================= -->
          <NxTabPanel value="0">
            <NxCard class="mt-3">
              <p v-if="negocioFormError" class="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ negocioFormError }}</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NxInput v-model="negocio.name" label="Nombre del negocio" :disabled="!canEdit" :error="negocioErrors.name" />
                <NxInput v-model="negocio.owner_name" label="Nombre del propietario" :disabled="!canEdit" :error="negocioErrors.owner_name" />
                <NxInput v-model="negocio.phone" label="Telefono" :disabled="!canEdit" :error="negocioErrors.phone" />
                <NxInput v-model="negocio.nit" label="NIT" :disabled="!canEdit" :error="negocioErrors.nit" />
                <NxInput v-model="negocio.address" label="Direccion" class="sm:col-span-2" :disabled="!canEdit" :error="negocioErrors.address" />
                <NxInput v-model="negocio.whatsapp_number" label="WhatsApp de contacto" :disabled="!canEdit" :error="negocioErrors.whatsapp_number" />
                <NxInput v-model="negocio.instagram_handle" label="Instagram" :disabled="!canEdit" :error="negocioErrors.instagram_handle" />
                <NxInput v-model="negocio.tiktok_handle" label="TikTok" :disabled="!canEdit" :error="negocioErrors.tiktok_handle" />
              </div>
              <NxButton v-if="canEdit" class="mt-4" :loading="isSaving" @click="submitNegocio">Guardar cambios</NxButton>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Facturacion y tickets ================= -->
          <NxTabPanel value="1">
            <NxCard class="mt-3">
              <p v-if="facturacionFormError" class="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ facturacionFormError }}</p>
              <p class="mb-3 text-sm font-semibold text-slate-700">Ticket termico</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NxInput v-model="facturacion.invoice_prefix" label="Prefijo de factura" placeholder="FAC" :disabled="!canEdit" :error="facturacionErrors.invoice_prefix" />
                <NxSelect
                  v-model="facturacion.ticket_paper_width"
                  label="Ancho de papel"
                  :options="paperWidthOptions"
                  option-label="label"
                  option-value="value"
                  :disabled="!canEdit"
                />
                <NxInput v-model="facturacion.ticket_header_tagline" label="Frase de encabezado" class="sm:col-span-2" :disabled="!canEdit" :error="facturacionErrors.ticket_header_tagline" />
                <NxInput v-model="facturacion.ticket_thanks_message" label="Mensaje de agradecimiento" class="sm:col-span-2" :disabled="!canEdit" :error="facturacionErrors.ticket_thanks_message" />
                <NxTextarea v-model="facturacion.ticket_footer_text" label="Texto de pie de ticket" class="sm:col-span-2" :disabled="!canEdit" :error="facturacionErrors.ticket_footer_text" />
              </div>

              <p class="mb-3 mt-6 text-sm font-semibold text-slate-700">Marca en correos</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-600">Color de encabezado</label>
                  <input v-model="facturacion.email_header_color" type="color" class="h-10 w-20 cursor-pointer rounded border border-slate-200" :disabled="!canEdit" />
                </div>
                <NxInput v-model="facturacion.email_footer_text" label="Texto de pie de correo" :disabled="!canEdit" :error="facturacionErrors.email_footer_text" />
                <div class="sm:col-span-2">
                  <NxToggleButton v-model="facturacion.email_whatsapp_cta" label="Incluir boton de WhatsApp en los correos" icon="pi pi-whatsapp" :disabled="!canEdit" />
                </div>
              </div>

              <NxButton v-if="canEdit" class="mt-4" :loading="isSaving" @click="submitFacturacion">Guardar cambios</NxButton>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Ventas ================= -->
          <NxTabPanel value="2">
            <NxCard class="mt-3">
              <p v-if="ventasFormError" class="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ ventasFormError }}</p>

              <p class="mb-2 text-sm font-semibold text-slate-700">Domicilios</p>
              <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                <NxToggleButton v-model="ventas.delivery_enabled" label="Cobrar domicilio" icon="pi pi-truck" :disabled="!canEdit" />
                <NxInputNumber v-model="ventas.delivery_fee" label="Valor del domicilio" :disabled="!canEdit || !ventas.delivery_enabled" :error="ventasErrors.delivery_fee" />
              </div>

              <p class="mb-2 text-sm font-semibold text-slate-700">Cargos adicionales</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="flex items-end gap-3">
                  <NxToggleButton v-model="ventas.service_charge_enabled" label="Propina sugerida" icon="pi pi-percentage" :disabled="!canEdit" />
                  <NxInputNumber
                    v-model="ventas.service_charge_rate"
                    label="% propina"
                    :currency="false"
                    :disabled="!canEdit || !ventas.service_charge_enabled"
                    :error="ventasErrors.service_charge_rate"
                  />
                </div>
                <div class="flex items-end gap-3">
                  <NxToggleButton v-model="ventas.ipoconsumo_enabled" label="Impoconsumo" icon="pi pi-percentage" :disabled="!canEdit" />
                  <NxInputNumber
                    v-model="ventas.ipoconsumo_rate"
                    label="% impoconsumo"
                    :currency="false"
                    :disabled="!canEdit || !ventas.ipoconsumo_enabled"
                    :error="ventasErrors.ipoconsumo_rate"
                  />
                </div>
              </div>

              <NxButton v-if="canEdit" class="mt-4" :loading="isSaving" @click="submitVentas">Guardar cambios</NxButton>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Medios de pago ================= -->
          <NxTabPanel value="8">
            <NxCard class="mt-3">
              <p class="mb-1 text-sm font-semibold text-slate-700">Metodos de pago</p>
              <p class="mb-3 text-xs text-slate-500">
                Selecciona del catalogo los que acepta tu negocio. Un medio nunca se elimina, solo se deshabilita, para no romper el historial
                de ventas que ya lo usaron.
              </p>

              <p v-if="paymentMethodsFormError" class="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ paymentMethodsFormError }}</p>

              <div v-if="paymentMethodsQuery.isPending.value" class="mb-6 h-24 animate-pulse rounded-xl bg-slate-100" />

              <template v-else>
                <p
                  v-if="!paymentMethodsQuery.data.value?.migrated && paymentMethodsQuery.data.value?.legacy_payment_methods.length"
                  class="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800"
                >
                  Hoy tienes configurado (todavía sin pasar al catálogo nuevo):
                  {{ paymentMethodsQuery.data.value.legacy_payment_methods.map((m) => m.label).join(', ') }}. Selecciona abajo los que uses y
                  guarda para pasarlos al catálogo.
                </p>

                <div class="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <div v-for="method in paymentMethodsQuery.data.value?.data ?? []" :key="method.id" class="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p class="text-sm font-medium text-slate-700">{{ method.label }}</p>
                      <p v-if="!method.is_active" class="text-xs text-amber-600">Retirado del catálogo por Nexolú - puedes deshabilitarlo.</p>
                    </div>
                    <NxSwitch v-model="paymentMethodSelections[method.id]" :disabled="!canEdit" />
                  </div>
                  <p v-if="!paymentMethodsQuery.data.value?.data.length" class="px-4 py-6 text-center text-sm text-slate-400">
                    Todavía no hay medios de pago en el catálogo.
                  </p>
                </div>

                <div v-if="canEdit" class="mb-6 flex flex-wrap items-center gap-3">
                  <NxButton size="sm" :loading="updatePaymentMethods.isPending.value" @click="savePaymentMethods">Guardar medios de pago</NxButton>
                  <button type="button" class="text-xs font-medium text-indigo-600 hover:underline" @click="supportModalOpen = true">
                    ¿No está el que necesitas? Contacta a soporte
                  </button>
                </div>
              </template>
            </NxCard>

            <NxCard class="mt-3">
              <p class="mb-1 text-sm font-semibold text-slate-700">Cobrar con pasarela</p>
              <p class="mb-3 text-xs text-slate-500">
                Conecta tu propia cuenta de Bold o Wompi. La plata entra directo a tu cuenta del proveedor: Nexolú nunca la
                retiene. Con Bold, la misma llave te sirve después para cobrar con el datáfono.
              </p>

              <div class="flex flex-col gap-3">
                <PaymentGatewayCard
                  v-for="provider in gatewaysQuery.data.value ?? []"
                  :key="provider.provider_slug"
                  :provider="provider"
                />
              </div>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Inventario ================= -->
          <NxTabPanel value="3">
            <NxCard class="mt-3">
              <p v-if="inventarioFormError" class="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ inventarioFormError }}</p>

              <p
                v-if="snoozedUntilLabel"
                class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
              >
                <span><i class="pi pi-bell-slash mr-1.5" />Las alertas de inventario bajo estan silenciadas hasta el {{ snoozedUntilLabel }}.</span>
                <NxButton v-if="canEdit" size="sm" variant="outline" :loading="clearSnooze.isPending.value" @click="reactivateAlerts">Reactivar ahora</NxButton>
              </p>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NxInputNumber
                  v-model="inventario.low_stock_alert_threshold"
                  label="Umbral de stock bajo"
                  :currency="false"
                  :min="0"
                  :disabled="!canEdit"
                  :error="inventarioErrors.low_stock_alert_threshold"
                />
                <div class="flex items-end">
                  <NxToggleButton v-model="inventario.low_stock_email_enabled" label="Avisar por correo" icon="pi pi-envelope" :disabled="!canEdit" />
                </div>
                <NxInput
                  v-model="inventario.low_stock_email"
                  label="Correo para alertas"
                  class="sm:col-span-2"
                  :disabled="!canEdit || !inventario.low_stock_email_enabled"
                  :error="inventarioErrors.low_stock_email"
                />
              </div>

              <NxButton v-if="canEdit" class="mt-4" :loading="isSaving" @click="submitInventario">Guardar cambios</NxButton>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Apartados ================= -->
          <NxTabPanel v-if="business?.can_access_layaways" value="4">
            <NxCard class="mt-3">
              <p class="mb-1 text-sm font-semibold text-slate-700">Categorias habilitadas para apartar</p>
              <p class="mb-3 text-xs text-slate-500">Que categorias de productos pueden reservarse con abono en el modulo de Apartados.</p>

              <NxToggleButton v-model="layawayAllCategories" label="Todas las categorias" icon="pi pi-tags" :disabled="!canEdit" />

              <div v-if="!layawayAllCategories" class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="category in categoriesQuery.data.value ?? []"
                  :key="category.id"
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-sm transition-colors"
                  :class="
                    layawaySelectedCategoryIds.includes(category.id)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  "
                  :disabled="!canEdit"
                  @click="toggleLayawayCategory(category.id)"
                >
                  {{ category.name }}
                </button>
              </div>

              <NxButton v-if="canEdit" class="mt-4" :loading="isSaving" @click="submitApartados">Guardar cambios</NxButton>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Ordenes de servicio ================= -->
          <NxTabPanel v-if="business?.can_access_services" value="5">
            <NxCard class="mt-3">
              <p class="mb-1 text-sm font-semibold text-slate-700">Órdenes de servicio</p>
              <p class="mb-3 text-xs text-slate-500">Opciones para el formulario de creación de órdenes.</p>

              <div class="flex flex-col gap-4">
                <div>
                  <NxToggleButton v-model="showCatalog" label="Mostrar catálogo de servicios" icon="pi pi-wrench" :disabled="!canEdit" />
                  <p class="mt-1 text-xs text-slate-500">Permite seleccionar un servicio del catálogo al crear una orden.</p>
                </div>

                <div>
                  <NxInput v-model="defaultServiceName" label="Nombre de servicio por defecto" placeholder="Ej. Servicio Técnico" :disabled="!canEdit" />
                  <p class="mt-1 text-xs text-slate-500">Se pre-llena en el campo nombre al crear una orden nueva.</p>
                </div>
              </div>

              <NxButton v-if="canEdit" class="mt-4" :loading="isSaving" @click="submitServicios">Guardar cambios</NxButton>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Notificaciones WhatsApp ================= -->
          <NxTabPanel value="6">
            <NxCard class="mt-3">
              <p class="mb-1 text-sm font-semibold text-slate-700">Notificaciones por WhatsApp</p>
              <p class="mb-3 text-xs text-slate-500">Que avisos quieres recibir en tu WhatsApp vinculado.</p>

              <p v-if="!whatsappLinked" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Vincula tu WhatsApp desde el Dashboard para poder activar estas alertas.
              </p>

              <template v-else>
                <div class="flex flex-col gap-4">
                  <div v-for="type in NOTIFICATION_TYPES" :key="type.key" class="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div>
                      <p class="text-sm font-medium text-slate-700">{{ type.label }}</p>
                      <p class="text-xs text-slate-500">{{ type.desc }}</p>
                    </div>
                    <div class="flex items-center gap-3">
                      <NxInput
                        v-if="type.schedulable && notificationPrefs[type.key]"
                        v-model="notificationSchedule[type.key]"
                        type="time"
                        label="Hora"
                        size="sm"
                        class="w-28"
                        :disabled="!canEdit"
                      />
                      <NxSwitch v-model="notificationPrefs[type.key]" :disabled="!canEdit" />
                    </div>
                  </div>
                </div>

                <NxButton v-if="canEdit" class="mt-4" :loading="notificationsSaving" @click="saveNotifications">Guardar cambios</NxButton>
              </template>
            </NxCard>
          </NxTabPanel>

          <!-- ================= Asistente de IA ================= -->
          <NxTabPanel value="7">
            <NxCard class="mt-3">
              <p class="mb-1 text-sm font-semibold text-slate-700">Asistente de IA</p>
              <p class="mb-3 text-xs text-slate-500">Cupo de mensajes incluido este mes y paquetes comprados.</p>

              <div v-if="quotaQuery.isPending.value" class="h-24 animate-pulse rounded-xl bg-slate-100" />

              <template v-else-if="quota">
                <div class="mb-3">
                  <div class="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Cupo mensual usado</span>
                    <span>{{ quota.consumed_this_month }} / {{ quota.applicable_quota }}</span>
                  </div>
                  <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="quotaUsedPercent >= 100 ? 'bg-red-500' : 'bg-indigo-500'"
                      :style="{ width: quotaUsedPercent + '%' }"
                    />
                  </div>
                </div>

                <div class="mb-3 grid grid-cols-2 gap-3">
                  <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p class="mb-0.5 text-xs text-slate-500">Cupo mensual restante</p>
                    <p class="text-lg font-bold" :class="quota.remaining_quota === 0 ? 'text-red-700' : 'text-slate-900'">
                      {{ quota.remaining_quota }}
                    </p>
                  </div>
                  <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p class="mb-0.5 text-xs text-slate-500">Paquetes comprados</p>
                    <p class="text-lg font-bold text-slate-900">{{ quota.pack_balance }}</p>
                  </div>
                </div>

                <p
                  v-if="quota.remaining_quota === 0 && quota.pack_balance === 0"
                  class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                >
                  Se agotó el cupo de mensajes de este mes.
                  <span v-if="!quota.is_admin">Pídele al dueño del negocio que compre un paquete adicional.</span>
                </p>

                <div v-if="packCheckout.verifying.value" class="mb-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                  <i class="pi pi-spin pi-spinner" />
                  Verificando tu pago...
                </div>

                <div
                  v-else-if="packCheckout.activated.value"
                  class="mb-3 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  <i class="pi pi-check-circle" />
                  Paquete acreditado.
                </div>

                <div
                  v-else-if="packCheckout.timedOut.value"
                  class="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                  <i class="pi pi-clock mt-0.5" />
                  <div>
                    <p>Tu pago fue recibido pero la acreditación está tardando.</p>
                    <NxButton size="sm" variant="outline" class="mt-2" @click="quotaQuery.refetch()">Verificar de nuevo</NxButton>
                  </div>
                </div>

                <NxButton
                  v-if="quota.is_admin && !packCheckout.verifying.value && !packCheckout.activated.value"
                  size="sm"
                  variant="outline"
                  icon="pi pi-credit-card"
                  :loading="packCheckout.paying.value"
                  @click="buyPack"
                >
                  {{
                    packCheckout.paying.value
                      ? 'Abriendo pasarela de pago...'
                      : `Comprar paquete de ${quota.pack_size} mensajes (${formatCop(quota.pack_price_cop)})`
                  }}
                </NxButton>

                <p v-if="packCheckout.error.value" class="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {{ packCheckout.error.value }}
                </p>
              </template>
            </NxCard>
          </NxTabPanel>
        </NxTabPanels>
      </NxTabs>
    </template>

    <NxModal v-model="supportModalOpen" title="Contacta a soporte" size="sm">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-slate-600">
          Cuéntanos qué medio de pago necesitas y por qué - le llega directo al equipo de Nexolú con el asunto "Solicitud de añadir medio de
          pago".
        </p>
        <NxTextarea v-model="supportMessage" label="Mensaje" placeholder="Ej. Necesitamos Bancolombia a la Mano" :rows="4" />
      </div>
      <template #footer>
        <div class="flex gap-2">
          <NxButton variant="outline" class="flex-1" @click="supportModalOpen = false">Cancelar</NxButton>
          <NxButton class="flex-1" :loading="requestSupport.isPending.value" :disabled="!supportMessage.trim()" @click="submitSupportRequest">
            Enviar
          </NxButton>
        </div>
      </template>
    </NxModal>
  </div>
</template>
