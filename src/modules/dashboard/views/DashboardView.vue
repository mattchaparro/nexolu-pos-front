<script setup lang="ts">
// Version recortada de Pages/Admin/Dashboard.vue del legacy: las 5
// StatCards (resumen del dia), el nombre real del negocio y el "consejo
// del dia". Quedan afuera para cuando exista el modulo de chat IA:
// tarjeta de insight IA y onboarding de WhatsApp - ambas enlazan a esa
// conversacion, que este frontend todavia no tiene. La grilla de atajos
// personalizable queda para cuando haya 2-3 modulos reales a los que
// apuntar.
import { NxPageHeader, NxStatCard } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import ConsejoDelDiaCard from '../components/ConsejoDelDiaCard.vue'
import { useBusiness } from '../composables/useBusiness'
import { useDashboardSummary } from '../composables/useDashboardSummary'

const { data: stats, isPending, isError } = useDashboardSummary()
const { data: business } = useBusiness()
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

    <ConsejoDelDiaCard class="mt-6" />
  </div>
</template>
