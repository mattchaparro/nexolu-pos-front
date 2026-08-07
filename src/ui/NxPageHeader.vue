<script setup lang="ts">
// Calcado de Components/PageHeader.vue del legacy. El legacy permitia un
// prop `color` para variar el degradado del icono por pantalla - se
// saca a proposito, mismo motivo que en NxStatCard: sin criterio
// semantico para variar el color, se queda fijo en indigo (marca).
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    icon?: string
  }>(),
  {
    subtitle: undefined,
    icon: undefined,
  },
)
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      v-if="icon"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600"
    >
      <i :class="icon" class="text-white" />
    </div>
    <div class="min-w-0">
      <h2 class="truncate text-xl font-semibold leading-tight text-slate-900">{{ title }}</h2>
      <p v-if="subtitle" class="mt-1 text-sm text-slate-600">{{ subtitle }}</p>
    </div>
  </div>
</template>
