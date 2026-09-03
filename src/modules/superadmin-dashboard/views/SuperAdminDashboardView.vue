<script setup lang="ts">
// Tablero de plataforma: cuantos negocios hay, cuanto se factura y a quien
// se le vence la suscripcion esta semana. Consume
// SuperAdmin\DashboardController (nexolu-pos-api).
//
// El contador de tickets de soporte que traia el legacy ya no esta: ese
// modulo se retiro (nadie lo uso nunca) y ahora el soporte es por WhatsApp.
import { useRouter } from 'vue-router'

import { NxCard, NxColumn, NxDataTable, NxPageHeader } from '@/ui'
import type { DashboardBusinessRow, DashboardTopBusinessRow } from '@/types/superAdminDashboard'
import { formatCop } from '@/utils/formatCop'

import { useSuperAdminDashboard } from '../composables/useSuperAdminDashboard'

const dashboardQuery = useSuperAdminDashboard()
const router = useRouter()

function openBusiness(id: number): void {
  router.push({ name: 'superadmin.businesses.show', params: { id } })
}

/**
 * Rojo solo cuando ya no hay margen para reaccionar. Pintar de rojo algo que
 * vence en 6 dias hace que el color deje de significar urgencia.
 */
function remainingClass(days: number | null): string {
  if (days === null) {
    return 'text-slate-400'
  }
  if (days <= 1) {
    return 'text-red-600 font-semibold'
  }
  if (days <= 3) {
    return 'text-amber-600 font-semibold'
  }
  return 'text-slate-600'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader title="Dashboard" icon="pi pi-th-large" compact />

    <div v-if="dashboardQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="dashboardQuery.data.value">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Negocios</p>
          <p class="text-2xl font-bold text-slate-900">{{ dashboardQuery.data.value.stats.total_businesses }}</p>
          <p class="text-xs text-slate-400">
            {{ dashboardQuery.data.value.stats.paid }} pagos ·
            {{ dashboardQuery.data.value.stats.trial }} en prueba ·
            {{ dashboardQuery.data.value.stats.expired }} vencidos
          </p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">MRR</p>
          <p class="text-2xl font-bold text-slate-900">{{ formatCop(dashboardQuery.data.value.stats.mrr_cop) }}</p>
          <!-- MRR es lo que DEBERIA entrar cada mes segun los planes activos;
               "ingreso del mes" es lo que efectivamente se cobro. No son lo
               mismo y verlos juntos es lo que muestra la mora. -->
          <p class="text-xs text-slate-400">
            {{ formatCop(dashboardQuery.data.value.stats.monthly_revenue_cop) }} cobrado este mes
          </p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Usuarios</p>
          <p class="text-2xl font-bold text-slate-900">{{ dashboardQuery.data.value.stats.total_users }}</p>
          <p class="text-xs text-slate-400">en toda la plataforma</p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Últimos 30 días</p>
          <p class="text-2xl font-bold text-slate-900">
            +{{ dashboardQuery.data.value.stats.new_businesses_last_30_days }}
          </p>
          <p class="text-xs text-slate-400">
            negocios · {{ dashboardQuery.data.value.stats.closed_sales_last_30_days }} ventas cerradas
          </p>
        </NxCard>
      </div>

      <!-- Lo que vence primero va arriba: es lo unico de esta pantalla sobre
           lo que hay que hacer algo hoy. -->
      <NxCard>
        <p class="mb-3 text-sm font-semibold text-slate-900">Vencen esta semana</p>
        <NxDataTable :value="dashboardQuery.data.value.expiring_businesses">
          <template #empty>
            <p class="py-6 text-center text-sm text-slate-400">Nadie vence en los próximos 7 días.</p>
          </template>
          <NxColumn header="Negocio">
            <template #body="{ data }: { data: DashboardBusinessRow }">
              <button
                type="button"
                class="text-sm font-semibold text-slate-900 hover:text-indigo-600"
                @click="openBusiness(data.id)"
              >
                {{ data.name }}
              </button>
              <p v-if="data.owner_name" class="text-xs text-slate-400">{{ data.owner_name }}</p>
            </template>
          </NxColumn>
          <NxColumn header="Estado">
            <template #body="{ data }: { data: DashboardBusinessRow }">
              <span class="text-sm text-slate-600">{{ data.status }}</span>
            </template>
          </NxColumn>
          <NxColumn header="Le quedan">
            <template #body="{ data }: { data: DashboardBusinessRow }">
              <span class="text-sm" :class="remainingClass(data.days_remaining)">
                {{ data.days_remaining === null ? '—' : `${data.days_remaining} día(s)` }}
              </span>
            </template>
          </NxColumn>
        </NxDataTable>
      </NxCard>

      <NxCard>
        <p class="mb-3 text-sm font-semibold text-slate-900">Negocios con más ventas</p>
        <NxDataTable :value="dashboardQuery.data.value.top_businesses">
          <template #empty>
            <p class="py-6 text-center text-sm text-slate-400">Todavía no hay ventas registradas.</p>
          </template>
          <NxColumn header="Negocio">
            <template #body="{ data }: { data: DashboardTopBusinessRow }">
              <button
                type="button"
                class="text-sm font-semibold text-slate-900 hover:text-indigo-600"
                @click="openBusiness(data.id)"
              >
                {{ data.name }}
              </button>
              <p class="text-xs text-slate-400">{{ data.status }}</p>
            </template>
          </NxColumn>
          <NxColumn header="Ventas">
            <template #body="{ data }: { data: DashboardTopBusinessRow }">
              <span class="text-sm font-semibold text-slate-900">{{ data.sales_count }}</span>
            </template>
          </NxColumn>
          <NxColumn header="Productos">
            <template #body="{ data }: { data: DashboardTopBusinessRow }">
              <span class="text-sm text-slate-600">{{ data.products_count }}</span>
            </template>
          </NxColumn>
          <NxColumn header="Usuarios">
            <template #body="{ data }: { data: DashboardTopBusinessRow }">
              <span class="text-sm text-slate-600">{{ data.users_count }}</span>
            </template>
          </NxColumn>
        </NxDataTable>
      </NxCard>
    </template>
  </div>
</template>
