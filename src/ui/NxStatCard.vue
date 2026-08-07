<script setup lang="ts">
// Calcado de Components/StatCard.vue del legacy, con un cambio
// deliberado: el legacy le daba un color distinto (verde/azul/ambar/
// naranja/rojo) a cada tarjeta sin ningun criterio semantico - exactamente
// el patron que se decidio no repetir. Todas las NxStatCard usan el
// mismo acento (indigo, color de marca) porque ninguna de estas es un
// estado de exito/advertencia/error, son solo cifras informativas.
defineProps<{
  label: string
  value: string
  icon: string
}>()
</script>

<template>
  <div class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex min-w-0 items-center gap-3">
      <div class="flex-shrink-0 rounded-lg bg-indigo-50 p-2">
        <i :class="icon" class="text-lg text-indigo-600" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-xs font-medium text-slate-500">{{ label }}</p>
        <p class="truncate text-lg font-bold text-slate-900">{{ value }}</p>
      </div>
    </div>
  </div>
</template>
