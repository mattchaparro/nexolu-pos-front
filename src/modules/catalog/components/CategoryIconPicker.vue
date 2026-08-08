<script setup lang="ts">
// Selector de icono para categorias (Material Icons, mismo vocabulario que
// resuelve CategoryIconResolver del backend) - grilla agrupada + buscador,
// portado de Categories/Save.vue del legacy pero sin la paleta de color por
// indice (ver categoryIcons.ts).
import { computed, ref } from 'vue'

import { NxInput } from '@/ui'

import { CATEGORY_ICON_GROUPS, CATEGORY_ICONS } from '../support/categoryIcons'

const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const search = ref('')

const groupedIcons = computed(() => {
  const term = search.value.trim().toLowerCase()
  const filtered = term
    ? CATEGORY_ICONS.filter((i) => i.label.toLowerCase().includes(term) || i.id.includes(term))
    : CATEGORY_ICONS

  return CATEGORY_ICON_GROUPS.map((group) => ({
    group,
    icons: filtered.filter((i) => i.group === group),
  })).filter((g) => g.icons.length > 0)
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <NxInput v-model="search" label="Buscar ícono" size="sm" icon="pi pi-search" clearable />

    <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-2">
      <div v-if="groupedIcons.length === 0" class="py-4 text-center text-xs text-slate-400">
        Sin resultados.
      </div>
      <div v-for="group in groupedIcons" :key="group.group" class="mb-2 last:mb-0">
        <p class="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ group.group }}</p>
        <div class="grid grid-cols-6 gap-1 sm:grid-cols-8">
          <button
            v-for="icon in group.icons"
            :key="icon.id"
            type="button"
            :title="icon.label"
            class="flex aspect-square items-center justify-center rounded-lg border transition-colors"
            :class="
              props.modelValue === icon.id
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-transparent text-slate-500 hover:bg-slate-100'
            "
            @click="emit('update:modelValue', icon.id)"
          >
            <span class="material-icons text-lg">{{ icon.id }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
