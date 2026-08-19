<script setup lang="ts">
// Contrato de "stat tile" de la skill de dataviz: label + value + delta
// opcional (con signo, coloreado segun si subir es bueno o malo). El acento
// de valor bueno/malo son los tokens de "delta" del chrome de la skill, no
// los colores de marca de Nexolu - son semanticos (sube/baja), no de marca.
withDefaults(
  defineProps<{
    label: string
    value: string
    delta?: number | null
    deltaLabel?: string
    /** 'up' (default): subir es bueno, ej. ingresos. 'down': bajar es bueno, ej. gastos. */
    goodDirection?: 'up' | 'down'
  }>(),
  {
    delta: null,
    deltaLabel: '',
    goodDirection: 'up',
  },
)
</script>

<template>
  <div class="viz-root flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p class="text-xs font-medium text-slate-500">{{ label }}</p>
    <p class="text-xl font-semibold text-slate-900">{{ value }}</p>
    <p v-if="delta !== null" class="flex items-center gap-1 text-xs">
      <i
        class="pi text-[10px]"
        :class="delta >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"
        :style="{ color: (delta >= 0) === (goodDirection === 'up') ? 'var(--delta-good)' : 'var(--delta-bad)' }"
      />
      <span
        class="font-semibold"
        :style="{ color: (delta >= 0) === (goodDirection === 'up') ? 'var(--delta-good)' : 'var(--delta-bad)' }"
      >
        {{ delta >= 0 ? '+' : '' }}{{ delta }}%
      </span>
      <span class="text-slate-400">{{ deltaLabel }}</span>
    </p>
  </div>
</template>

<style scoped>
/* Sin variantes de modo oscuro a proposito: el resto de la app no tiene tema
   oscuro (darkModeSelector: false en main.ts) y esta tarjeta es bg-white
   fijo - responder a prefers-color-scheme del sistema volveria el texto
   blanco sobre ese fondo blanco fijo. */
.viz-root {
  --delta-good: #006300;
  --delta-bad: #d03b3b;
}
</style>
