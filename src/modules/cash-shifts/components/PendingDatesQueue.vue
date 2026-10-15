<script setup lang="ts">
// Dias con movimiento que no tienen cierre de caja. Solo informativo: no hace
// falta cerrarlos uno por uno, porque la base se arrastra con lo que conto
// cada turno al cerrar (ver CashShiftService::expectedOpeningCash) y cerrar
// hoy saca todos estos dias de la lista. Tocar uno sirve para revisarlo.
const props = defineProps<{ dates: string[]; selected: string }>()
const emit = defineEmits<{ select: [date: string] }>()

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p class="text-xs text-slate-600">
      <i class="pi pi-info-circle mr-1 text-slate-400" />
      {{ props.dates.length === 1 ? 'Hay 1 día' : `Hay ${props.dates.length} días` }} sin cierre de caja. No hace falta
      cerrarlos uno por uno: al cerrar hoy, la base inicial ya trae lo que contaron los turnos.
    </p>
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-slate-400">Revisar un día:</span>
      <button
        v-for="date in props.dates"
        :key="date"
        type="button"
        class="rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
        :class="
          date === props.selected
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
        "
        @click="emit('select', date)"
      >
        {{ formatDate(date) }}
      </button>
    </div>
  </div>
</template>
