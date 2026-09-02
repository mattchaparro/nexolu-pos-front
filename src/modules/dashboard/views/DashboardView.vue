<script setup lang="ts">
// Version recortada de Pages/Admin/Dashboard.vue del legacy: las StatCards
// (resumen del dia), el nombre real del negocio, el card de onboarding de
// WhatsApp y el "consejo del dia". Queda afuera para cuando exista el
// modulo de chat IA: la tarjeta de insight IA (esa si depende de la
// conversacion, que este frontend todavia no tiene).
//
// La grilla de atajos SI esta migrada (a diferencia del comentario
// original de este archivo, que la dejaba pendiente) - a diferencia del
// legacy (solo el admin personalizaba, el empleado tenia una grilla fija
// de hasta 4 botones sin poder tocarla), aca admin y empleado personalizan
// por igual: dashboard_shortcuts es una columna por usuario, y los
// candidatos salen de useNavItems() (ya filtrado por permiso/feature para
// quien sea que este mirando), asi que no hace falta una lista separada
// por rol.
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useNavItems } from '@/composables/useNavItems'
import { usePermissions } from '@/composables/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import { NxPageHeader, NxStatCard } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import AiInsightCard from '../components/AiInsightCard.vue'
import ConsejoDelDiaCard from '../components/ConsejoDelDiaCard.vue'
import ShortcutCustomizer from '../components/ShortcutCustomizer.vue'
import ShortcutsGrid from '../components/ShortcutsGrid.vue'
import WhatsappOnboardingCard from '../components/WhatsappOnboardingCard.vue'
import { useDashboardSummary } from '../composables/useDashboardSummary'
import { resolveShortcuts } from '../support/shortcuts'


const { data: stats, isPending, isError } = useDashboardSummary()
const { data: business } = useBusiness()
const navItems = useNavItems()

// Mismo gate que el chat (ai_chat.use): el insight lo redacta el mismo
// servicio de IA, solo que embebido. Un empleado sin ese permiso no deberia
// ver en Inicio lo que no puede consultar en el Asistente.
const auth = useAuthStore()
const { hasPermission } = usePermissions()
const canUseAi = computed(
  () => hasPermission('ai_chat.use') || auth.user?.roles?.includes('admin') === true,
)

const customizerOpen = ref(false)
const shortcuts = computed(() => resolveShortcuts(stats.value?.shortcuts ?? null, navItems.value))
</script>

<template>
  <div>
    <NxPageHeader
      :title="business?.name ?? 'Mi Negocio'"
      subtitle="Resumen del día"
      icon="pi pi-shop"
    />

    <p v-if="isError" class="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      No pudimos cargar el resumen del día. Intenta de nuevo más tarde.
    </p>

    <div v-else class="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <template v-if="isPending">
        <div v-for="n in 4" :key="n" class="h-[70px] animate-pulse rounded-xl bg-slate-200" />
      </template>
      <template v-else-if="stats">
        <NxStatCard label="Ventas hoy" :value="formatCop(stats.today_sales)" icon="pi pi-dollar" />
        <NxStatCard
          label="Número de ventas"
          :value="String(stats.today_count)"
          icon="pi pi-receipt"
        />
        <NxStatCard label="Efectivo hoy" :value="formatCop(stats.today_cash)" icon="pi pi-money-bill" />
        <NxStatCard label="Transferencia hoy" :value="formatCop(stats.today_transfer)" icon="pi pi-credit-card" />
        <NxStatCard
          label="Cuentas abiertas"
          :value="formatCop(stats.open_tabs_total)"
          icon="pi pi-book"
        />
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

    <ShortcutsGrid v-if="stats" class="mt-6" :shortcuts="shortcuts" @customize="customizerOpen = true" />

    <AiInsightCard v-if="canUseAi" class="mt-6" />
    <WhatsappOnboardingCard class="mt-6" />
    <ConsejoDelDiaCard class="mt-6" />

    <ShortcutCustomizer v-model="customizerOpen" :saved-shortcuts="stats?.shortcuts ?? null" :nav-items="navItems" />
  </div>
</template>
