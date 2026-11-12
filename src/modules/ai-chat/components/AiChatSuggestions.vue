<script setup lang="ts">
// Botones de preguntas sugeridas. Dos formas: `full` (pantalla vacia,
// agrupadas por tema) y `compact` (fila que se desliza encima del campo de
// texto, para seguir preguntando sin pensar que escribir).
import { computed } from 'vue'

import { SUGGESTION_GROUPS, type AiSuggestion, type SuggestionGroup } from '../support/suggestions'

const props = defineProps<{
  suggestions: AiSuggestion[]
  variant: 'full' | 'compact'
  disabled?: boolean
}>()

const emit = defineEmits<{ pick: [suggestion: AiSuggestion] }>()

const grouped = computed(() => {
  const groups = new Map<SuggestionGroup, AiSuggestion[]>()
  for (const suggestion of props.suggestions) {
    groups.set(suggestion.group, [...(groups.get(suggestion.group) ?? []), suggestion])
  }
  return [...groups.entries()].map(([group, items]) => ({ group, ...SUGGESTION_GROUPS[group], items }))
})
</script>

<template>
  <div v-if="variant === 'full'" class="mx-auto flex w-full max-w-3xl flex-col gap-5 py-2">
    <div class="text-center">
      <span class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <i class="pi pi-sparkles text-xl" />
      </span>
      <p class="mt-3 text-base font-semibold text-slate-900">¿Qué quieres saber de tu negocio?</p>
      <p class="mt-1 text-sm text-slate-500">Toca una pregunta o escribe la tuya abajo.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <section v-for="group in grouped" :key="group.group" class="rounded-xl border border-slate-200 p-3">
        <p class="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <i :class="group.icon" class="text-indigo-500" />
          {{ group.label }}
        </p>
        <div class="flex flex-col gap-1.5">
          <button
            v-for="suggestion in group.items"
            :key="suggestion.text"
            type="button"
            class="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-800 disabled:opacity-50"
            :disabled="disabled"
            @click="emit('pick', suggestion)"
          >
            <span>{{ suggestion.text }}</span>
            <i
              :class="suggestion.mode === 'draft' ? 'pi pi-pencil' : 'pi pi-arrow-right'"
              class="mt-1 shrink-0 text-[10px] text-slate-400"
              :title="suggestion.mode === 'draft' ? 'Se escribe en el campo para que lo ajustes' : undefined"
            />
          </button>
        </div>
      </section>
    </div>
  </div>

  <div v-else class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
    <button
      v-for="suggestion in suggestions"
      :key="suggestion.text"
      type="button"
      class="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs whitespace-nowrap text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
      :disabled="disabled"
      @click="emit('pick', suggestion)"
    >
      {{ suggestion.text }}
    </button>
  </div>
</template>
