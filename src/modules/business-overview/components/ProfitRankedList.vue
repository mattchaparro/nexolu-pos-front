<script setup lang="ts">
// Top por utilidad real, no por ingreso: la barra mide profit (revenue -
// costo), no ventas. Usa el verde de estado "good" (mismo token que el
// delta positivo de StatTile) en vez del azul de RankedBarList - aca el
// color si comunica algo (plata que se queda), no solo magnitud generica.
//
// Sin variantes de modo oscuro a proposito: el resto de la app no tiene tema
// oscuro (darkModeSelector: false en main.ts), las tarjetas que envuelven
// esto son bg-white fijo - si este componente respondiera a
// prefers-color-scheme del sistema operativo, el texto se volveria blanco
// sobre ese fondo blanco fijo y quedaria invisible.
import { computed } from 'vue'

import type { ProfitProduct } from '@/types/businessOverview'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ items: ProfitProduct[] }>()

const maxProfit = computed(() => Math.max(1, ...props.items.map((i) => i.profit)))

function widthPct(profit: number): number {
  return Math.max(2, (profit / maxProfit.value) * 100)
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
          {{ formatQty(item.qty_sold) }} und.
          <span v-if="item.margin_pct !== null" class="font-semibold" style="color: var(--series-good)">
            · {{ item.margin_pct }}% margen
          </span>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-4 flex-1 overflow-hidden rounded-full" style="background: var(--track)">
          <div class="h-full rounded-full" :style="{ width: `${widthPct(item.profit)}%`, background: 'var(--series-good)' }" />
        </div>
        <span class="w-24 shrink-0 text-right text-xs font-semibold tabular-nums" style="color: var(--text-primary)">
          {{ formatCop(item.profit) }}
        </span>
      </div>
    </div>
    <p v-if="items.length === 0" class="py-4 text-center text-xs" style="color: var(--text-muted)">
      Sin productos con costo configurado en este período.
    </p>
  </div>
</template>

<style scoped>
.viz-root {
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --series-good: #006300;
  --track: #e1e0d9;
}
</style>
