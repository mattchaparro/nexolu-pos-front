<script setup lang="ts">
// Inicio. Orden pensado para lo que el dueño abre el POS a ver:
//  1. Cabecera: el negocio, la fecha y "Compartir" (un menú corto: se usa
//     una o dos veces, no merece una franja entera).
//  2. Lo que falta para dejar el negocio listo (solo mientras falte algo).
//  3. Las cifras de hoy.
//  4. Atajos y, al lado (debajo en el celular), el Asistente: el resumen
//     inteligente con el consejo del día al pie, en una sola tarjeta.
//
// Los atajos los personaliza cada usuario (dashboard_shortcuts es una
// columna por usuario) y los candidatos salen de useNavItems(), ya filtrado
// por permiso/feature de quien mira.
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useNavItems } from '@/composables/useNavItems'
import { usePermissions } from '@/composables/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import { NxStatCard } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import AiInsightCard from '../components/AiInsightCard.vue'
import BusinessSetupCard from '../components/BusinessSetupCard.vue'
import ShareMenuButton from '../components/ShareMenuButton.vue'
import ShortcutCustomizer from '../components/ShortcutCustomizer.vue'
import ShortcutsGrid from '../components/ShortcutsGrid.vue'
import WhatsappOnboardingCard from '../components/WhatsappOnboardingCard.vue'
import { useDashboardSummary } from '../composables/useDashboardSummary'
import { dailyTip } from '../support/dailyTip'
import { resolveShortcuts } from '../support/shortcuts'

const { data: stats, isPending, isError } = useDashboardSummary()
const { data: business } = useBusiness()
const navItems = useNavItems()

// Mismo gate que el chat (ai_chat.use): el insight lo redacta el mismo
// servicio de IA. Un empleado sin ese permiso no deberia ver en Inicio lo
// que no puede consultar en el Asistente.
const auth = useAuthStore()
const { hasPermission } = usePermissions()
const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)
const canUseAi = computed(() => hasPermission('ai_chat.use') || isAdmin.value)

const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
const todayLabel = today.charAt(0).toUpperCase() + today.slice(1)

const tip = dailyTip()

const customizerOpen = ref(false)
const shortcuts = computed(() => resolveShortcuts(stats.value?.shortcuts ?? null, navItems.value))

function salesCountLabel(count: number): string {
  return count === 1 ? '1 venta' : `${count} ventas`
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600"
        >
          <i class="pi pi-shop text-white" />
        </div>
        <div class="min-w-0">
          <h2 class="truncate text-xl font-semibold leading-tight text-slate-900">
            {{ business?.name ?? 'Mi negocio' }}
          </h2>
          <p class="mt-0.5 text-sm text-slate-500">{{ todayLabel }}</p>
        </div>
      </div>
      <!-- Publicar la página es decisión del dueño (endpoint business-admin). -->
      <ShareMenuButton v-if="isAdmin" class="shrink-0" />
    </div>

    <BusinessSetupCard v-if="isAdmin" />
    <WhatsappOnboardingCard />

    <p v-if="isError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      No pudimos cargar el resumen del día. Intenta de nuevo más tarde.
    </p>

    <div v-else class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <template v-if="isPending">
        <div v-for="n in 4" :key="n" class="h-[78px] animate-pulse rounded-xl bg-slate-200" />
      </template>
      <template v-else-if="stats">
        <NxStatCard
          label="Ventas hoy"
          :value="formatCop(stats.today_sales)"
          :hint="salesCountLabel(stats.today_count)"
          icon="pi pi-dollar"
        />
        <NxStatCard label="Efectivo" :value="formatCop(stats.today_cash)" icon="pi pi-money-bill" />
        <NxStatCard label="Otros medios" :value="formatCop(stats.today_transfer)" icon="pi pi-credit-card" />
        <NxStatCard label="Cuentas abiertas" :value="formatCop(stats.open_tabs_total)" icon="pi pi-book" />
        <NxStatCard
          v-if="stats.receivables_enabled"
          label="Fiados pendientes"
          :value="formatCop(stats.pending_receivables)"
          icon="pi pi-wallet"
        />
        <NxStatCard
          v-if="stats.expenses_enabled"
          label="Gastos hoy"
          :value="formatCop(stats.today_expenses)"
          icon="pi pi-money-bill"
        />
      </template>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <ShortcutsGrid
        v-if="stats"
        class="lg:col-span-2"
        :shortcuts="shortcuts"
        @customize="customizerOpen = true"
      />
      <div v-if="canUseAi" class="flex flex-col gap-3">
        <h3 class="text-base font-semibold text-slate-900">Asistente</h3>
        <AiInsightCard :tip="tip" />
      </div>
    </div>

    <ShortcutCustomizer v-model="customizerOpen" :saved-shortcuts="stats?.shortcuts ?? null" :nav-items="navItems" />
  </div>
</template>
