<script setup lang="ts">
/**
 * Selector visual de iconos.
 *
 * Antes esto era un campo de texto donde había que escribir `truck` de
 * memoria: quien no conocía la lista escribía cualquier cosa y le salía el
 * icono genérico sin entender por qué.
 *
 * El catálogo lo aporta el anfitrión (ver `IconOption`), así que este
 * componente no sabe de emoji ni de comercio — solo dibuja lo que le pasan.
 */
import { computed, ref } from 'vue'

import type { IconOption } from './types'

const props = defineProps<{
  modelValue: string | null | undefined
  icons: IconOption[]
  label?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const open = ref(false)
const search = ref('')

const selected = computed(() => props.icons.find((icon) => icon.value === props.modelValue) ?? null)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.icons

  return props.icons.filter(
    (icon) => icon.label.toLowerCase().includes(term) || icon.value.toLowerCase().includes(term),
  )
})

/** Agrupado para que una lista de 40 iconos siga siendo navegable. */
const groups = computed(() => {
  const map = new Map<string, IconOption[]>()

  for (const icon of filtered.value) {
    const key = icon.group ?? ''
    map.set(key, [...(map.get(key) ?? []), icon])
  }

  return [...map.entries()].map(([name, icons]) => ({ name, icons }))
})

function choose(icon: IconOption): void {
  emit('update:modelValue', icon.value)
  open.value = false
  search.value = ''
}

function clear(): void {
  emit('update:modelValue', null)
  open.value = false
}
</script>

<template>
  <div class="bke-icon">
    <label v-if="label" class="bke-label">{{ label }}</label>

    <button type="button" class="bke-icon-trigger" @click="open = !open">
      <span class="bke-icon-glyph">{{ selected?.glyph ?? '➕' }}</span>
      <span class="bke-icon-name">{{ selected?.label ?? 'Elegir ícono' }}</span>
      <span class="bke-icon-caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="bke-icon-panel">
      <input
        v-model="search"
        type="search"
        class="bke-input bke-icon-search"
        placeholder="Buscar ícono"
      />

      <div class="bke-icon-scroll">
        <div v-for="group in groups" :key="group.name">
          <p v-if="group.name" class="bke-icon-group">{{ group.name }}</p>
          <div class="bke-icon-grid">
            <button
              v-for="icon in group.icons"
              :key="icon.value"
              type="button"
              class="bke-icon-cell"
              :class="{ 'is-selected': icon.value === modelValue }"
              :title="icon.label"
              @click="choose(icon)"
            >
              <span class="bke-icon-glyph">{{ icon.glyph }}</span>
            </button>
          </div>
        </div>

        <p v-if="filtered.length === 0" class="bke-icon-empty">Sin resultados.</p>
      </div>

      <button v-if="selected" type="button" class="bke-icon-clear" @click="clear">
        Quitar ícono
      </button>
    </div>
  </div>
</template>
