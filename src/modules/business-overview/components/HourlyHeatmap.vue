<script setup lang="ts">
// Horas calientes/frias: mapa de calor dia de semana x hora, rampa
// secuencial de un solo tono (skill de dataviz: magnitud = un hue,
// claro->oscuro, nunca arcoiris). El paso mas claro ya "lee" como cerca de
// cero por diseño de la rampa, asi que una celda sin ventas no necesita un
// gris aparte. Cada celda es su propio hit target de hover/foco (sin
// crosshair - eso es para lineas/barras, no para una grilla de celdas).
import { computed, ref } from 'vue'

import type { BusinessOverviewHeatmap, HeatmapCell } from '@/types/businessOverview'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ heatmap: BusinessOverviewHeatmap }>()

const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const weekdayFullLabels = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// Pasos representativos de la rampa secuencial azul (references/palette.md) -
// 6 cubetas alcanzan para que el ojo distinga intensidad sin ser un degradado continuo.
const ramp = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#1c5cab', '#0d366b']

const cellsByKey = computed(() => {
  const map = new Map<string, HeatmapCell>()
  for (const cell of props.heatmap.cells) {
    map.set(`${cell.weekday}-${cell.hour}`, cell)
  }
  return map
})

const maxRevenue = computed(() => Math.max(1, ...props.heatmap.cells.map((c) => c.revenue)))

function colorFor(revenue: number): string {
  const ratio = revenue / maxRevenue.value
  const step = Math.min(ramp.length - 1, Math.floor(ratio * ramp.length))
  return ramp[step]
}

function cellAt(weekday: number, hour: number): HeatmapCell {
  return cellsByKey.value.get(`${weekday}-${hour}`) ?? { weekday, hour, revenue: 0, sales_count: 0 }
}

function hourLabel(hour: number): string {
  if (hour === 0) return '12 a. m.'
  if (hour === 12) return '12 p. m.'
  return hour < 12 ? `${hour} a. m.` : `${hour - 12} p. m.`
}

const hourTickHours = [0, 6, 12, 18, 23]

const hovered = ref<HeatmapCell | null>(null)

function formatPeak(peak: { weekday: number; hour: number; revenue: number } | null): string | null {
  if (!peak) {
    return null
  }
  return `${weekdayFullLabels[peak.weekday]} ${hourLabel(peak.hour)} · ${formatCop(peak.revenue)}`
}
</script>

<template>
  <div class="viz-root flex flex-col gap-3">
    <div class="overflow-x-auto">
      <div class="inline-grid gap-[2px]" :style="{ gridTemplateColumns: `32px repeat(24, 1fr)` }">
        <div />
        <div
          v-for="hour in 24"
          :key="`h-${hour - 1}`"
          class="text-center text-[9px]"
          style="color: var(--text-muted)"
        >
          {{ hourTickHours.includes(hour - 1) ? hour - 1 : '' }}
        </div>

        <template v-for="weekday in 7" :key="`row-${weekday - 1}`">
          <div class="flex items-center pr-1 text-[10px] font-medium" style="color: var(--text-secondary)">
            {{ weekdayLabels[weekday - 1] }}
          </div>
          <button
            v-for="hour in 24"
            :key="`cell-${weekday - 1}-${hour - 1}`"
            type="button"
            class="h-4 w-full min-w-[10px] rounded-[2px] transition-transform hover:scale-110 focus:scale-110 focus:outline-none"
            :style="{ backgroundColor: colorFor(cellAt(weekday - 1, hour - 1).revenue) }"
            :title="`${weekdayFullLabels[weekday - 1]} ${hourLabel(hour - 1)}: ${formatCop(cellAt(weekday - 1, hour - 1).revenue)}`"
            @pointerenter="hovered = cellAt(weekday - 1, hour - 1)"
            @focus="hovered = cellAt(weekday - 1, hour - 1)"
            @pointerleave="hovered = null"
            @blur="hovered = null"
          />
        </template>
      </div>
    </div>

    <div class="flex items-center gap-2 text-[11px]" style="color: var(--text-muted)">
      <span>Menos</span>
      <div class="flex h-2 w-24 overflow-hidden rounded-full">
        <span v-for="c in ramp" :key="c" class="flex-1" :style="{ backgroundColor: c }" />
      </div>
      <span>Más</span>
    </div>

    <div v-if="hovered" class="rounded-lg border px-3 py-1.5 text-xs" :style="{ background: 'var(--surface-1)', borderColor: 'var(--border)' }">
      <span class="font-semibold" style="color: var(--text-primary)">{{ formatCop(hovered.revenue) }}</span>
      <span style="color: var(--text-secondary)">
        · {{ weekdayFullLabels[hovered.weekday] }} {{ hourLabel(hovered.hour) }} · {{ hovered.sales_count }} venta(s)
      </span>
    </div>

    <div class="grid gap-2 sm:grid-cols-2">
      <p v-if="heatmap.peak" class="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <i class="pi pi-arrow-up-right mr-1" />
        Hora más fuerte: <strong>{{ formatPeak(heatmap.peak) }}</strong>
      </p>
      <p v-if="heatmap.slow" class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <i class="pi pi-arrow-down-right mr-1" />
        Hora más floja: <strong>{{ formatPeak(heatmap.slow) }}</strong>
      </p>
      <p v-if="!heatmap.peak" class="text-xs text-slate-400">Sin ventas suficientes en los últimos 30 días para ver un patrón.</p>
    </div>
  </div>
</template>

<style scoped>
.viz-root {
  --surface-1: #fcfcfb;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --border: rgba(11, 11, 11, 0.1);
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme='light'])) .viz-root {
    --surface-1: #1a1a19;
    --text-primary: #ffffff;
    --text-secondary: #c3c2b7;
    --text-muted: #898781;
    --border: rgba(255, 255, 255, 0.1);
  }
}
:root[data-theme='dark'] .viz-root {
  --surface-1: #1a1a19;
  --text-primary: #ffffff;
  --text-secondary: #c3c2b7;
  --text-muted: #898781;
  --border: rgba(255, 255, 255, 0.1);
}
</style>
