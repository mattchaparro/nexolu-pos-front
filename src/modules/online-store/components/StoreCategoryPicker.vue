<script setup lang="ts">
// Elegir qué categorías van en el bloque de atajos del home.
//
// Solo ofrece las PUBLICADAS: enlazar desde el home a una categoría que no
// está en la tienda lleva al comprador a una página vacía.
//
// El orden de selección importa — es el orden en que se pintan —, así que se
// agrega al final en vez de reordenar por el catálogo.
import { computed } from 'vue'

import { useCategories } from '@/modules/catalog/composables/useCategories'

const props = defineProps<{ value: unknown; max?: number }>()
const emit = defineEmits<{ select: [value: unknown] }>()

const { data } = useCategories()

const selected = computed<number[]>(() =>
  Array.isArray(props.value) ? (props.value as number[]) : [],
)

const available = computed(() => (data.value ?? []).filter((category) => category.is_published))

function toggle(id: number): void {
  if (selected.value.includes(id)) {
    emit(
      'select',
      selected.value.filter((current) => current !== id),
    )
    return
  }

  if (props.max !== undefined && selected.value.length >= props.max) {
    return
  }

  emit('select', [...selected.value, id])
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="available.length === 0" class="text-xs text-slate-400">
      No tienes categorías publicadas todavía. Publícalas desde Catálogo → Categorías.
    </p>

    <div v-else class="flex max-h-56 flex-col gap-1 overflow-y-auto">
      <label
        v-for="category in available"
        :key="category.id"
        class="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
      >
        <input
          type="checkbox"
          :checked="selected.includes(category.id)"
          :disabled="!selected.includes(category.id) && max !== undefined && selected.length >= max"
          @change="toggle(category.id)"
        />
        <span :class="category.parent_id ? 'pl-3 text-slate-500' : ''">{{ category.name }}</span>
      </label>
    </div>

    <p v-if="max" class="text-[11px] text-slate-400">
      {{ selected.length }} de {{ max }} elegidas.
    </p>
  </div>
</template>
