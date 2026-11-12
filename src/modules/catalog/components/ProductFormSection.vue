<script setup lang="ts">
// Una sección numerada del formulario de producto. El número dice en qué
// orden se llena: primero qué es el producto, después cómo se vende.
defineProps<{
  step: number
  title: string
  subtitle?: string
}>()
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
    <header class="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <span
        class="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700"
      >
        {{ step }}
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-slate-800">{{ title }}</h2>
        <p v-if="subtitle" class="mt-0.5 text-xs text-slate-500">{{ subtitle }}</p>
      </div>
      <slot name="aside" />
    </header>
    <div class="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
      <slot />
    </div>
  </section>
</template>
