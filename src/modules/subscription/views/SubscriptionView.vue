<script setup lang="ts">
// "Mi suscripcion" - puerto de Subscription/Billing.vue del legacy: estado
// de la suscripcion, promo activa, pago en linea via el widget de Wompi
// (Nexolu Payments Core por detras, ver useSubscriptionCheckout) e
// historial de pagos. Sin la seccion de addon de IA del legacy (ya no se
// factura aparte, ver docs/MIGRATION_BACKLOG.md) ni el fallback de pago
// manual/WhatsApp (no hay precedente de esos datos en este repo todavia).
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useAuthStore } from '@/stores/auth.store'
import type { SubscriptionPayment, SubscriptionStatus } from '@/types/subscription'
import { NxButton, NxCard, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import BillingConfirmModal from '../components/BillingConfirmModal.vue'
import DirectCheckoutPanel from '../components/DirectCheckoutPanel.vue'
import { useDirectCheckout } from '../composables/useDirectCheckout'
import { usePaymentMethodsCatalog } from '../composables/usePaymentMethodsCatalog'
import { useSubscriptionCheckout } from '../composables/useSubscriptionCheckout'
import { useSubscriptionStatus } from '../composables/useSubscriptionStatus'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const businessQuery = useBusiness()
const business = computed(() => businessQuery.data.value ?? null)

// Prendido/apagado desde Payments Core (Integration.widget_enabled) - ver
// docs/APP_INTEGRATION.md del Core. Arranca en false mientras carga o si el
// Core no lo trae, asi el boton del widget nunca aparece "de mas".
const catalogQuery = usePaymentMethodsCatalog()
const widgetEnabled = computed(() => catalogQuery.data.value?.widget_enabled ?? false)

const statusQuery = useSubscriptionStatus()
const data = computed(() => statusQuery.data.value ?? null)
const isActive = computed(() => data.value?.status === 'paid' || data.value?.status === 'trial')

// Colapsado por defecto: en mobile, el detalle (dias, fechas, plan, promo)
// empujaba fuera de la primera pantalla tanto el boton de pagar como el
// aviso de "verificando tu pago" - lo mas importante para el usuario en
// ese momento. Ver tambien anyVerifying/anyDeclined/anyTimedOut mas abajo.
const showDetails = ref(false)

const statusConfig: Record<SubscriptionStatus, { label: string; class: string; icon: string }> = {
  paid: { label: 'Activa', class: 'bg-emerald-100 text-emerald-700', icon: 'pi pi-check-circle' },
  trial: { label: 'En prueba', class: 'bg-sky-100 text-sky-700', icon: 'pi pi-hourglass' },
  expired: { label: 'Vencida', class: 'bg-red-100 text-red-700', icon: 'pi pi-times-circle' },
  inactive: { label: 'Inactiva', class: 'bg-slate-100 text-slate-500', icon: 'pi pi-pause-circle' },
}

const checkout = useSubscriptionCheckout()
// Flujo nuevo (flow="api", sin abrir el widget) - convive con `checkout`
// (Widget legado) sin tocarlo. El estado de "verificando/confirmado" se
// combina abajo porque ambos terminan igual: esperando el mismo webhook
// del Core, solo cambia como se inicio el cobro.
const direct = useDirectCheckout()

const anyVerifying = computed(() => checkout.verifying.value || direct.verifying.value)
const anyActivated = computed(() => checkout.activated.value || direct.activated.value)
const anyDeclined = computed(() => checkout.declined.value || direct.declined.value)
const anyTimedOut = computed(() => checkout.timedOut.value || direct.timedOut.value)

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

const methodLabels: Record<string, string> = { wompi: 'Wompi', wava: 'Wava', manual: 'Transferencia', nequi: 'Nequi' }
function methodLabel(payment: SubscriptionPayment): string {
  return methodLabels[payment.payment_method ?? ''] ?? payment.payment_method ?? 'Manual'
}

const showWidgetBilling = ref(false)

async function payNow(): Promise<void> {
  if (!auth.user) {
    return
  }
  showWidgetBilling.value = false
  await checkout.pay({ email: auth.user.email, fullName: auth.user.full_name })
}

onMounted(() => {
  // Fallback de navegacion (mobile): Wompi redirigio de vuelta con
  // ?wompi_paid=1 en vez de solo devolver el resultado al callback del widget.
  if (route.query.wompi_paid === '1') {
    checkout.startPolling()
    router.replace({ query: {} })
  }
})

onUnmounted(() => {
  checkout.stop()
  direct.stop()
})
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4">
    <NxPageHeader title="Mi suscripción" icon="pi pi-credit-card" compact />

    <template v-if="statusQuery.isPending.value">
      <div class="h-48 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <template v-else-if="data">
      <!-- Tarjeta de estado: negocio + estado siempre visibles, el detalle
           colapsado por defecto (ver comentario de showDetails). -->
      <NxCard>
        <div class="flex min-w-0 flex-col items-start gap-2">
          <p class="truncate text-lg font-bold text-slate-900">{{ business?.name ?? '—' }}</p>
          <span
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
            :class="statusConfig[data.status].class"
          >
            <i :class="statusConfig[data.status].icon" />
            {{ statusConfig[data.status].label }}
          </span>
        </div>

        <details
          class="mt-4 rounded-lg border border-slate-200"
          :open="showDetails"
          @toggle="showDetails = ($event.target as HTMLDetailsElement).open"
        >
          <summary
            class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase [&::-webkit-details-marker]:hidden"
          >
            Detalle de tu suscripción
            <i class="pi text-sm" :class="showDetails ? 'pi-chevron-up' : 'pi-chevron-down'" />
          </summary>

          <div class="border-t border-slate-200 p-3">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p class="mb-0.5 text-xs text-slate-500">Días restantes</p>
                <p class="text-2xl font-extrabold" :class="data.days_remaining <= 5 ? 'text-red-700' : 'text-slate-900'">
                  {{ data.days_remaining }}
                </p>
              </div>
              <div v-if="data.paid_until" class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p class="mb-0.5 text-xs text-slate-500">{{ isActive ? 'Activa hasta' : 'Venció el' }}</p>
                <p class="text-sm font-bold text-slate-900">{{ formatDate(data.paid_until) }}</p>
              </div>
              <div v-else-if="data.trial_ends_at" class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p class="mb-0.5 text-xs text-slate-500">Prueba hasta</p>
                <p class="text-sm font-bold text-slate-900">{{ formatDate(data.trial_ends_at) }}</p>
              </div>
              <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p class="mb-0.5 text-xs text-slate-500">Plan mensual</p>
                <div v-if="data.pricing.has_custom_price" class="flex flex-col gap-0.5">
                  <p class="text-xs text-slate-400 line-through">{{ formatCop(data.pricing.plan_standard_cop) }}</p>
                  <p class="text-sm font-bold text-indigo-700">{{ formatCop(data.pricing.plan_base_cop) }}</p>
                </div>
                <p v-else class="text-sm font-bold text-slate-900">{{ formatCop(data.pricing.plan_base_cop) }}</p>
              </div>
            </div>

            <div v-if="data.pricing.is_promo_eligible" class="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <i class="pi pi-tag shrink-0 text-emerald-600" />
              <p class="text-sm text-emerald-800">
                <strong>Promo {{ data.pricing.promo_discount_percent }}% dto</strong>
                aplicada · mes {{ data.pricing.paid_cycles + 1 }} de {{ data.pricing.promo_months }} · pagas
                <strong>{{ formatCop(data.pricing.total_cop) }}</strong> este ciclo
              </p>
            </div>
          </div>
        </details>
      </NxCard>

      <!-- Verificando pago -->
      <div v-if="anyVerifying" class="flex items-center gap-4 rounded-xl border border-sky-200 bg-sky-50 p-5">
        <i class="pi pi-spin pi-spinner text-2xl text-sky-500" />
        <div>
          <p class="font-semibold text-sky-800">Verificando tu pago...</p>
          <p class="mt-0.5 text-sm text-sky-700">Espera un momento mientras confirmamos con Wompi que todo quedó bien.</p>
        </div>
      </div>

      <!-- Pago confirmado -->
      <div v-else-if="anyActivated" class="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
        <i class="pi pi-check-circle mt-0.5 text-2xl text-emerald-500" />
        <div>
          <p class="font-semibold text-emerald-800">Pago confirmado</p>
          <p class="mt-0.5 text-sm text-emerald-700">Tu suscripción está activa.</p>
        </div>
      </div>

      <!-- Pago rechazado (confirmado por el webhook, no por la respuesta de la pasarela) -->
      <div v-else-if="anyDeclined" class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
        <i class="pi pi-times-circle mt-0.5 text-2xl text-red-500" />
        <div>
          <p class="font-semibold text-red-800">Tu pago fue rechazado</p>
          <p class="mt-0.5 text-sm text-red-700">
            No pudimos procesar el pago. Verifica los datos e intenta de nuevo, o prueba con otro método de pago.
          </p>
        </div>
      </div>

      <!-- Timeout esperando el webhook -->
      <div v-else-if="anyTimedOut" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <i class="pi pi-clock mt-0.5 text-2xl text-amber-500" />
        <div>
          <p class="font-semibold text-amber-800">Pago en proceso</p>
          <p class="mt-0.5 text-sm text-amber-700">
            Tu pago fue recibido pero la activación está tardando. Si ya te cobraron, el acceso se activará en los próximos minutos.
          </p>
          <NxButton size="sm" variant="outline" class="mt-2" @click="statusQuery.refetch()">Verificar de nuevo</NxButton>
        </div>
      </div>

      <!-- Todo al dia -->
      <div v-else-if="isActive" class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <i class="pi pi-verified mt-0.5 text-2xl text-emerald-500" />
        <div>
          <p class="font-semibold text-emerald-800">Todo al día</p>
          <p class="mt-0.5 text-sm text-emerald-700">
            Tu suscripción está activa.
            <span v-if="data.paid_until"
              >Vence el <strong>{{ formatDate(data.paid_until) }}</strong
              >.</span
            >
            <span v-else-if="data.trial_ends_at"
              >Tu periodo de prueba termina el <strong>{{ formatDate(data.trial_ends_at) }}</strong
              >.</span
            >
          </p>
        </div>
      </div>

      <!-- Pago en linea -->
      <NxCard v-if="!anyVerifying && !anyActivated">
        <p class="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {{ isActive ? 'Pagar siguiente periodo' : 'Realizar pago' }}
        </p>
        <p v-if="isActive && data.paid_until" class="mb-4 text-xs text-slate-400">
          Los días se acumulan a partir del <strong>{{ formatDate(data.paid_until) }}</strong
          >.
        </p>

        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="mb-1 text-xs text-slate-400">Valor a pagar</p>
            <p class="text-4xl font-extrabold text-slate-900">{{ formatCop(data.pricing.total_cop) }}</p>
            <p v-if="data.pricing.is_promo_eligible" class="mt-1 text-xs text-emerald-700">
              Desc. {{ data.pricing.promo_discount_percent }}% · regular {{ formatCop(data.pricing.plan_base_cop) }}
            </p>
          </div>
        </div>

        <DirectCheckoutPanel :direct="direct" />

        <template v-if="widgetEnabled">
          <div class="my-4 flex items-center gap-3 text-xs text-slate-400">
            <span class="h-px flex-1 bg-slate-200" />
            o
            <span class="h-px flex-1 bg-slate-200" />
          </div>

          <NxButton
            class="w-full"
            variant="outline"
            size="lg"
            icon="pi pi-credit-card"
            :loading="checkout.paying.value"
            @click="showWidgetBilling = true"
          >
            {{ checkout.paying.value ? 'Abriendo pasarela de pago...' : 'Pagar con el widget de Wompi' }}
          </NxButton>
        </template>

        <p v-if="checkout.error.value" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ checkout.error.value }}
        </p>

        <p class="mt-3 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
          <i class="pi pi-lock text-[11px]" />
          Pago seguro vía Wompi · Tarjeta, Nequi, PSE, Bancolombia
        </p>
      </NxCard>

      <!-- Historial de pagos -->
      <NxCard v-if="data.payments.length" :padded="false">
        <template #header>
          <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Historial de pagos</p>
        </template>
        <ul class="divide-y divide-slate-100">
          <li v-for="payment in data.payments" :key="payment.id" class="flex items-center justify-between gap-3 px-5 py-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900">{{ formatCop(payment.amount_cop) }}</p>
              <p class="text-xs text-slate-500">
                {{ formatDate(payment.paid_at) }} · {{ methodLabel(payment) }}
                <span v-if="payment.days_granted"> · {{ payment.days_granted }} días</span>
              </p>
            </div>
            <span class="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <i class="pi pi-check text-[10px]" />
              Pagado
            </span>
          </li>
        </ul>
      </NxCard>
      <p v-else class="py-4 text-center text-xs text-slate-400">Sin pagos registrados todavía.</p>

      <BillingConfirmModal
        v-model="showWidgetBilling"
        title="Pagar con Wompi"
        description="Antes de abrir la pasarela de pago, confirma tus datos de facturación."
        confirm-label="Continuar"
        :paying="checkout.paying.value"
        :error="null"
        @submit="payNow"
      />
    </template>
  </div>
</template>
