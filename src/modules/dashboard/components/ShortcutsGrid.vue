<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { ResolvedShortcut } from '../support/shortcuts'

defineProps<{
  shortcuts: ResolvedShortcut[]
}>()

defineEmits<{ customize: [] }>()

const COLOR_CLASSES: Record<ResolvedShortcut['color'], string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  outline: 'bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-indigo-300 text-slate-800',
}

const ICON_CLASSES: Record<ResolvedShortcut['color'], string> = {
  primary: 'text-white',
  outline: 'text-indigo-600',
}
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-base font-semibold text-slate-900">Acciones rápidas</h3>
      <button
        type="button"
        class="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-indigo-600"
        title="Personalizar atajos"
        @click="$emit('customize')"
      >
        <i class="pi pi-sliders-h text-base" />
        <span class="hidden sm:inline">Personalizar</span>
      </button>
    </div>

    <!-- Compactos: icono y nombre en una fila. Caben más sin empujar el resto
         de Inicio fuera de la pantalla del celular. -->
    <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      <RouterLink
        v-for="s in shortcuts"
        :key="s.routeName"
        :to="{ name: s.routeName }"
        :class="[
          'flex min-h-14 items-center gap-3 rounded-xl px-4 py-3 shadow-sm transition-all active:scale-95',
          COLOR_CLASSES[s.color],
        ]"
      >
        <i :class="[s.icon, ICON_CLASSES[s.color]]" class="text-xl" />
        <span class="min-w-0 text-sm font-semibold leading-tight">{{ s.label }}</span>
      </RouterLink>

      <button
        v-if="shortcuts.length === 0"
        type="button"
        class="col-span-2 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-8 text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 sm:col-span-3"
        @click="$emit('customize')"
      >
        <i class="pi pi-plus-circle text-3xl" />
        <span class="text-sm font-medium">Agrega tus atajos</span>
      </button>
    </div>
  </div>
</template>
