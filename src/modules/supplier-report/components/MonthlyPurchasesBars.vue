<script setup lang="ts">
// Cuanto se compro cada mes, como barras horizontales: mismo estilo de un
// solo tono que RankedBarList (Mi negocio) - la barra es magnitud, no
// identidad, asi que no hace falta leyenda.
import { computed } from 'vue'

import type { SupplierReportMonth } from '@/types/supplierReport'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ months: SupplierReportMonth[] }>()

const max = computed(() => Math.max(1, ...props.months.map((m) => m.total_cop)))

function widthPct(total: number): number {
  return Math.max(2, (total / max.value) * 100)
}

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const label = new Date(year, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
</script>

<template>
  <div class="viz-root flex flex-col gap-2.5">
    <div v-for="item in months" :key="item.month" class="flex flex-col gap-1">
      <div class="flex items-baseline justify-between gap-2 text-xs">
        <span class="font-medium" style="color: var(--text-primary)">{{ monthLabel(item.month) }}</span>
        <span class="shrink-0 tabular-nums" style="color: var(--text-secondary)">
          {{ item.purchase_count }} {{ item.purchase_count === 1 ? 'compra' : 'compras' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-4 flex-1 overflow-hidden rounded-full" style="background: var(--track)">
          <div class="h-full rounded-full" :style="{ width: `${widthPct(item.total_cop)}%`, background: 'var(--series-1)' }" />
        </div>
        <span class="w-24 shrink-0 text-right text-xs font-semibold tabular-nums" style="color: var(--text-primary)">
          {{ formatCop(item.total_cop) }}
        </span>
      </div>
    </div>
    <p v-if="months.length === 0" class="py-4 text-center text-xs" style="color: var(--text-muted)">
      Sin compras en este período.
    </p>
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
