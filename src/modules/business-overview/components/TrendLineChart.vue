<script setup lang="ts">
// Linea de tendencia de 30 dias - una sola serie (ingreso), asi que sin
// leyenda (el titulo de la tarjeta ya dice que se grafica). Especificacion
// de marcas de la skill de dataviz: linea 2px, relleno de area al 10%,
// marcador del ultimo punto con anillo de superficie, crosshair + tooltip
// en hover/foco (el mouse nunca tiene que caer justo sobre la linea).
import { computed, ref } from 'vue'

import type { TrendDay } from '@/types/businessOverview'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ days: TrendDay[] }>()

const width = 720
const height = 220
const padLeft = 56
const padRight = 16
const padTop = 16
const padBottom = 28
const plotWidth = width - padLeft - padRight
const plotHeight = height - padTop - padBottom

const maxRevenue = computed(() => Math.max(1, ...props.days.map((d) => d.revenue)))

function xFor(index: number): number {
  const count = props.days.length
  if (count <= 1) {
    return padLeft
  }
  return padLeft + (index / (count - 1)) * plotWidth
}

function yFor(revenue: number): number {
  return padTop + plotHeight - (revenue / maxRevenue.value) * plotHeight
}

const linePath = computed(() =>
  props.days.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.revenue).toFixed(1)}`).join(' '),
)

const areaPath = computed(() => {
  if (props.days.length === 0) {
    return ''
  }
  const baseline = padTop + plotHeight
  const first = `M ${xFor(0).toFixed(1)} ${baseline}`
  const line = props.days.map((d, i) => `L ${xFor(i).toFixed(1)} ${yFor(d.revenue).toFixed(1)}`).join(' ')
  const close = `L ${xFor(props.days.length - 1).toFixed(1)} ${baseline} Z`
  return `${first} ${line} ${close}`
})

// 3 lineas de referencia horizontales (0%, 50%, 100% del maximo), redondeadas.
const gridLines = computed(() => [0, 0.5, 1].map((fraction) => ({ y: yFor(maxRevenue.value * fraction), value: maxRevenue.value * fraction })))

const xTickIndexes = computed(() => {
  const count = props.days.length
  if (count === 0) {
    return []
  }
  const step = Math.max(1, Math.round(count / 6))
  const indexes: number[] = []
  for (let i = 0; i < count; i += step) {
    indexes.push(i)
  }
  if (indexes[indexes.length - 1] !== count - 1) {
    indexes.push(count - 1)
  }
  return indexes
})

function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

const svgEl = ref<SVGSVGElement | null>(null)
const hoverIndex = ref<number | null>(null)

function onPointerMove(event: PointerEvent): void {
  if (!svgEl.value || props.days.length === 0) {
    return
  }
  const rect = svgEl.value.getBoundingClientRect()
  const scaleX = width / rect.width
  const localX = (event.clientX - rect.left) * scaleX
  const count = props.days.length
  const ratio = count <= 1 ? 0 : (localX - padLeft) / plotWidth
  const index = Math.round(ratio * (count - 1))
  hoverIndex.value = Math.min(count - 1, Math.max(0, index))
}

function onPointerLeave(): void {
  hoverIndex.value = null
}

const hoverDay = computed(() => (hoverIndex.value !== null ? props.days[hoverIndex.value] : null))
const tooltipX = computed(() => (hoverIndex.value !== null ? xFor(hoverIndex.value) : 0))
const tooltipY = computed(() => (hoverDay.value ? yFor(hoverDay.value.revenue) : 0))
// Voltea el tooltip a la izquierda del cursor cerca del borde derecho, para que no se salga del viewBox.
const tooltipAnchorsRight = computed(() => tooltipX.value > width - 140)
</script>

<template>
  <div class="viz-root">
    <svg
      ref="svgEl"
      :viewBox="`0 0 ${width} ${height}`"
      class="w-full"
      role="img"
      aria-label="Tendencia de ingresos de los últimos 30 días"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
    >
      <line
        v-for="g in gridLines"
        :key="g.value"
        :x1="padLeft"
        :x2="width - padRight"
        :y1="g.y"
        :y2="g.y"
        stroke="var(--gridline)"
        stroke-width="1"
      />
      <text
        v-for="g in gridLines"
        :key="`label-${g.value}`"
        :x="padLeft - 8"
        :y="g.y + 3"
        text-anchor="end"
        class="fill-current text-[10px]"
        style="fill: var(--text-muted)"
      >
        {{ formatCop(g.value) }}
      </text>

      <text
        v-for="i in xTickIndexes"
        :key="`x-${i}`"
        :x="xFor(i)"
        :y="height - 8"
        text-anchor="middle"
        class="text-[10px]"
        style="fill: var(--text-muted)"
      >
        {{ shortDate(days[i].date) }}
      </text>

      <path :d="areaPath" fill="var(--series-1-fill)" stroke="none" />
      <path :d="linePath" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      <circle
        v-if="days.length > 0"
        :cx="xFor(days.length - 1)"
        :cy="yFor(days[days.length - 1].revenue)"
        r="4"
        fill="var(--series-1)"
        stroke="var(--surface-1)"
        stroke-width="2"
      />

      <template v-if="hoverDay">
        <line :x1="tooltipX" :x2="tooltipX" :y1="padTop" :y2="padTop + plotHeight" stroke="var(--baseline)" stroke-width="1" />
        <circle :cx="tooltipX" :cy="tooltipY" r="4" fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2" />
      </template>

      <rect :x="padLeft" :y="padTop" :width="plotWidth" :height="plotHeight" fill="transparent" />
    </svg>

    <div
      v-if="hoverDay"
      class="pointer-events-none absolute rounded-lg border px-2.5 py-1.5 text-xs shadow-md"
      :style="{
        left: `${(tooltipAnchorsRight ? tooltipX - 150 : tooltipX + 10) / width * 100}%`,
        top: '4px',
        background: 'var(--surface-1)',
        borderColor: 'var(--border)',
      }"
    >
      <p class="font-semibold" style="color: var(--text-primary)">{{ formatCop(hoverDay.revenue) }}</p>
      <p style="color: var(--text-secondary)">{{ hoverDay.date }} · {{ hoverDay.sales_count }} venta(s)</p>
    </div>
  </div>
</template>

<style scoped>
.viz-root {
  position: relative;
  color-scheme: light;
  --surface-1: #fcfcfb;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --gridline: #e1e0d9;
  --baseline: #c3c2b7;
  --border: rgba(11, 11, 11, 0.1);
  --series-1: #2a78d6;
  --series-1-fill: rgb(42 120 214 / 10%);
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme='light'])) .viz-root {
    color-scheme: dark;
    --surface-1: #1a1a19;
    --text-primary: #ffffff;
    --text-secondary: #c3c2b7;
    --text-muted: #898781;
    --gridline: #2c2c2a;
    --baseline: #383835;
    --border: rgba(255, 255, 255, 0.1);
    --series-1: #3987e5;
    --series-1-fill: rgb(57 135 229 / 10%);
  }
}
:root[data-theme='dark'] .viz-root {
  color-scheme: dark;
  --surface-1: #1a1a19;
  --text-primary: #ffffff;
  --text-secondary: #c3c2b7;
  --text-muted: #898781;
  --gridline: #2c2c2a;
  --baseline: #383835;
  --border: rgba(255, 255, 255, 0.1);
  --series-1: #3987e5;
  --series-1-fill: rgb(57 135 229 / 10%);
}
</style>
