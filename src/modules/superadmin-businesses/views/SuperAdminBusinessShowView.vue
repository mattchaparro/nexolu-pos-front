<script setup lang="ts">
// Detalle de un negocio (solo lectura) - stats de los ultimos 30 dias,
// equipo (con boton de impersonar por usuario activo) y pagos de
// suscripcion recientes. Puerto acotado de SuperAdmin/Businesses/Show.vue
// del legacy - ver la conversacion sobre alcance de este panel para lo
// que queda deliberadamente afuera (activar/desactivar, extender trial,
// cambiar plan, precio personalizado, bloqueo de IA).
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { SuperAdminBusinessTeamMember } from '@/types/superadmin/business'
import { NxButton, NxPageHeader, NxStatCard, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs } from '@/ui'
import { FEATURE_FLAGS, resolveFeatureFlag } from '@/utils/businessFeaturePresets'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useBusiness } from '../composables/useBusiness'
import { useImpersonate } from '../composables/useImpersonate'

const route = useRoute()
const router = useRouter()

const businessId = computed(() => (route.params.id ? Number(route.params.id) : null))
const businessQuery = useBusiness(businessId)
const detail = computed(() => businessQuery.data.value ?? null)
const activeTab = ref<'resumen' | 'equipo' | 'pagos' | 'features'>('resumen')

// Sin restricciones configuradas (feature_flags null/vacio) = negocio
// viejo, todo habilitado por retrocompatibilidad - ver Business::hasFeature()
// en el backend y resolveFeatureFlag() aca.
const hasCustomFlags = computed(() => {
  const flags = detail.value?.business.feature_flags
  return !!flags && Object.keys(flags).length > 0
})
const featureRows = computed(() => {
  if (!detail.value) {
    return []
  }
  const { feature_flags: flags, subscription_plan: plan } = detail.value.business
  return FEATURE_FLAGS.map((feature) => ({
    ...feature,
    enabled: resolveFeatureFlag(flags, plan, feature.key),
  }))
})

const { impersonateMutation } = useImpersonate()

async function impersonate(member: SuperAdminBusinessTeamMember): Promise<void> {
  if (!window.confirm(`¿Entrar como "${member.name}"? Vas a ver el negocio tal como lo ve este usuario.`)) {
    return
  }
  try {
    await impersonateMutation.mutateAsync(member.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos impersonar a este usuario.'))
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="router.push({ name: 'superadmin.businesses.index' })">
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="detail ? detail.business.name : 'Negocio'" icon="pi pi-building" compact />
    </div>

    <template v-if="businessQuery.isPending.value">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <template v-else-if="detail">
      <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p><span class="text-slate-500">Dueño:</span> {{ detail.business.owner_name }}</p>
        <p v-if="detail.business.phone"><span class="text-slate-500">Teléfono:</span> {{ detail.business.phone }}</p>
        <p v-if="detail.business.nit"><span class="text-slate-500">NIT:</span> {{ detail.business.nit }}</p>
        <p v-if="detail.business.address"><span class="text-slate-500">Dirección:</span> {{ detail.business.address }}</p>
        <p><span class="text-slate-500">Plan:</span> {{ detail.business.subscription_plan ?? '—' }}</p>
        <p><span class="text-slate-500">Última actividad:</span> {{ formatDate(detail.business.last_activity_at) }}</p>
      </div>

      <NxTabs v-model:value="activeTab">
        <NxTabList>
          <NxTab value="resumen" icon="pi pi-chart-bar">Resumen</NxTab>
          <NxTab value="equipo" icon="pi pi-users">Equipo</NxTab>
          <NxTab value="pagos" icon="pi pi-receipt">Pagos</NxTab>
          <NxTab value="features" icon="pi pi-sliders-h">Features</NxTab>
        </NxTabList>
        <NxTabPanels>
          <NxTabPanel value="resumen">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <NxStatCard label="Ingresos (30d)" :value="formatCop(detail.stats.revenue_last_30_days)" icon="pi pi-wallet" />
              <NxStatCard label="Ventas cerradas (30d)" :value="String(detail.stats.closed_sales_last_30_days)" icon="pi pi-shopping-cart" />
              <NxStatCard label="Ticket promedio (30d)" :value="formatCop(detail.stats.avg_ticket_last_30_days)" icon="pi pi-chart-bar" />
              <NxStatCard label="Vendedores activos (30d)" :value="String(detail.stats.active_sellers_last_30_days)" icon="pi pi-users" />
              <NxStatCard label="Ventas abiertas ahora" :value="String(detail.stats.open_sales_now)" icon="pi pi-clock" />
              <NxStatCard label="Tickets de soporte abiertos" :value="String(detail.stats.open_support_tickets)" icon="pi pi-question-circle" />
            </div>
          </NxTabPanel>

          <NxTabPanel value="equipo">
            <div class="rounded-xl border border-slate-200 bg-white">
              <ul class="divide-y divide-slate-100">
                <li v-for="member in detail.team" :key="member.id" class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-900">
                      {{ member.name }}
                      <span v-if="!member.is_active" class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Inactivo</span>
                      <span v-if="member.is_business_owner" class="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">Dueño</span>
                    </p>
                    <p class="truncate text-xs text-slate-400">{{ member.email }} · {{ member.roles.join(', ') || 'sin rol' }}</p>
                  </div>
                  <NxButton
                    v-if="member.is_active"
                    size="sm"
                    variant="outline"
                    icon="pi pi-user"
                    :loading="impersonateMutation.isPending.value"
                    @click="impersonate(member)"
                  >
                    Impersonar
                  </NxButton>
                </li>
              </ul>
            </div>
          </NxTabPanel>

          <NxTabPanel value="pagos">
            <div v-if="detail.recent_subscription_payments.length" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table class="w-full min-w-[520px] text-sm">
                <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3 text-left">Fecha</th>
                    <th class="px-4 py-3 text-left">Periodo</th>
                    <th class="px-4 py-3 text-right">Monto</th>
                    <th class="px-4 py-3 text-left">Método</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="payment in detail.recent_subscription_payments" :key="payment.id">
                    <td class="px-4 py-3 whitespace-nowrap">{{ payment.paid_at ?? '—' }}</td>
                    <td class="px-4 py-3">{{ payment.period_label }}</td>
                    <td class="px-4 py-3 text-right font-medium">{{ formatCop(payment.amount_cop) }}</td>
                    <td class="px-4 py-3 text-slate-500">{{ payment.payment_method ?? '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="py-6 text-center text-sm text-slate-400">Sin pagos registrados todavía.</p>
          </NxTabPanel>

          <NxTabPanel value="features">
            <p v-if="!hasCustomFlags" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Este negocio no tiene restricciones configuradas (feature_flags vacío) - por retrocompatibilidad, tiene
              <strong>todo habilitado</strong> sin importar el plan.
            </p>
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <ul class="divide-y divide-slate-100">
                <li v-for="feature in featureRows" :key="feature.key" class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span class="text-slate-700">{{ feature.label }}</span>
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="feature.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                  >
                    {{ feature.enabled ? 'Habilitado' : 'Deshabilitado' }}
                  </span>
                </li>
              </ul>
            </div>
          </NxTabPanel>
        </NxTabPanels>
      </NxTabs>
    </template>
  </div>
</template>
