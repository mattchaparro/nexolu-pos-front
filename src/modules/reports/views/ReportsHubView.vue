<script setup lang="ts">
// Hub "Reportes": puerto de admin.reports.index del legacy (tarjetas que
// enlazan a cada reporte). A diferencia del legacy, Resumen del dia y Mi
// negocio ya tienen su propio item de menu de primer nivel (se construyeron
// antes que este hub) - se listan aca tambien porque conceptualmente son
// reportes, no para duplicar navegacion sino para que esta pantalla sea el
// punto de entrada completo a "todo lo que el negocio puede reportar".
// Cada tarjeta se gatea con el mismo criterio que su propia ruta (ver
// router/index.ts) - reports.inventory usa un OR de features que el
// backend resuelve solo, asi que aca no se filtra por feature, solo por
// permiso.
import { computed } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { usePermissions } from '@/composables/usePermissions'
import { hasFeature } from '@/utils/hasFeature'
import { NxPageHeader } from '@/ui'

const { hasPermission } = usePermissions()
const { data: business } = useBusiness()

interface ReportCard {
  routeName: string
  label: string
  description: string
  icon: string
  visible: boolean
}

const cards = computed<ReportCard[]>(() => [
  {
    routeName: 'daily-summary.index',
    label: 'Resumen del día',
    description: 'Ingreso del negocio de hoy o un rango, por canal y medio de pago.',
    icon: 'pi pi-chart-bar',
    visible: hasPermission('reports.daily_summary'),
  },
  {
    routeName: 'business-overview.index',
    label: 'Mi negocio',
    description: 'Crecimiento, horas pico, descuentos, fiado y rotación de productos.',
    icon: 'pi pi-chart-line',
    visible: hasPermission('reports.business_overview'),
  },
  {
    routeName: 'sales-history.index',
    label: 'Historial de ventas',
    description: 'Todas las ventas con filtros por fecha, estado, medio de pago y cliente.',
    icon: 'pi pi-receipt',
    visible: hasPermission('reports.sales'),
  },
  {
    routeName: 'sales-by-seller.index',
    label: 'Ventas por vendedor',
    description: 'Totales, ticket promedio y unidades vendidas por cada cajero.',
    icon: 'pi pi-users',
    visible: hasPermission('reports.sales_by_seller'),
  },
  {
    routeName: 'inventory-reports.index',
    label: 'Inventario',
    description: 'Movimientos de stock y márgenes por producto, con y sin ventas.',
    icon: 'pi pi-box',
    visible: hasPermission('reports.inventory') && (hasFeature(business.value, 'inventory_advanced') || hasFeature(business.value, 'ingredients')),
  },
  {
    routeName: 'accounting.index',
    label: 'Contabilidad gerencial',
    description: 'Utilidad neta mensual, líneas de ingreso/gasto y cierre de mes.',
    icon: 'pi pi-calculator',
    visible: hasPermission('accounting.manage') && hasFeature(business.value, 'managerial_accounting'),
  },
])

const visibleCards = computed(() => cards.value.filter((c) => c.visible))
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Reportes" icon="pi pi-chart-line" compact />

    <div v-if="visibleCards.length === 0" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
      Todavía no tienes acceso a ningún reporte. Pídele a un administrador que te otorgue el permiso correspondiente.
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="card in visibleCards"
        :key="card.routeName"
        :to="{ name: card.routeName }"
        class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
      >
        <div class="flex items-center gap-2">
          <i :class="card.icon" class="text-lg text-indigo-600" />
          <h2 class="text-sm font-semibold text-slate-900">{{ card.label }}</h2>
        </div>
        <p class="text-xs text-slate-500">{{ card.description }}</p>
      </router-link>
    </div>
  </div>
</template>
