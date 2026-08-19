<script setup lang="ts">
// Ranking con "impacto": no solo cuanto se vendio, sino que tan importante es
// para el ingreso del mes (% del total). Un solo hue (magnitud, no
// identidad) - top y menos rotacion usan el mismo tono; lo que cambia es la
// seccion en la que aparecen, no el color de la barra.
//
// Sin variantes de modo oscuro a proposito: el resto de la app no tiene tema
// oscuro (darkModeSelector: false en main.ts) y las tarjetas que envuelven
// esto son bg-white fijo - responder a prefers-color-scheme del sistema
// volveria el texto blanco sobre ese fondo blanco fijo.
import { computed } from 'vue'

import type { ProductRotation } from '@/types/businessOverview'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ items: ProductRotation[] }>()

const maxRevenue = computed(() => Math.max(1, ...props.items.map((i) => i.revenue)))

function widthPct(revenue: number): number {
  return Math.max(2, (revenue / maxRevenue.value) * 100)
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="viz-root flex flex-col gap-2.5">
    <div v-for="item in items" :key="item.product_id" class="flex flex-col gap-1">
      <div class="flex items-baseline justify-between gap-2 text-xs">
        <span class="truncate font-medium" style="color: var(--text-primary)">
          {{ item.name }}
          <span v-if="item.sku" class="font-normal" style="color: var(--text-muted)">· {{ item.sku }}</span>
        </span>
        <span class="shrink-0 tabular-nums" style="color: var(--text-secondary)">
          {{ formatQty(item.quantity) }} und.
          <span v-if="item.pct_of_revenue !== null" class="font-semibold" style="color: var(--series-1)">
            · {{ item.pct_of_revenue }}%
          </span>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-4 flex-1 overflow-hidden rounded-full" style="background: var(--track)">
          <div class="h-full rounded-full" :style="{ width: `${widthPct(item.revenue)}%`, background: 'var(--series-1)' }" />
        </div>
        <span class="w-20 shrink-0 text-right text-xs font-semibold tabular-nums" style="color: var(--text-primary)">
          {{ formatCop(item.revenue) }}
        </span>
      </div>
    </div>
    <p v-if="items.length === 0" class="py-4 text-center text-xs" style="color: var(--text-muted)">Sin ventas en este período.</p>
  </div>
</template>

<style scoped>
.viz-root {
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --series-1: #2a78d6;
  --track: #e1e0d9;
}
</style>
