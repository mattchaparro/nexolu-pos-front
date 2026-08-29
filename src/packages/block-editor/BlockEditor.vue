<script setup lang="ts">
// La lista de bloques: reordenar, agregar, quitar, apagar y editar.
//
// Arrastrar usa HTML5 drag & drop, que NO funciona en táctil. Por eso cada
// bloque tiene además botones de subir/bajar: en un POS sobre tablet ese es
// el camino principal, no un extra de accesibilidad.
import { computed, ref, toRef } from 'vue'

import BlockFields from './BlockFields.vue'
import type { Block, BlockDefinition } from './types'
import { useBlockList } from './useBlockList'
import './styles.css'

const props = defineProps<{ catalog: BlockDefinition[] }>()
const blocks = defineModel<Block[]>({ required: true })

const { definition, canAdd, add, remove, move, update } = useBlockList(blocks, toRef(props, 'catalog'))

const expanded = ref<string | null>(null)
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const adding = ref(false)

function toggle(id: string): void {
  expanded.value = expanded.value === id ? null : id
}

/** Un resumen del bloque para leerlo plegado, sin tener que abrirlo. */
function summary(block: Block): string {
  const candidate = block.title ?? block.question ?? block.address
  if (typeof candidate === 'string' && candidate.trim() !== '') {
    return candidate
  }
  const items = block.items
  if (Array.isArray(items) && items.length > 0) {
    return `${items.length} elemento${items.length === 1 ? '' : 's'}`
  }
  return 'Sin contenido todavía'
}

const addable = computed(() => props.catalog.filter((def) => canAdd(def.type)))

function onAdd(type: string): void {
  add(type)
  adding.value = false
}

function onDrop(index: number): void {
  if (dragIndex.value !== null) {
    move(dragIndex.value, index)
  }
  dragIndex.value = null
  dropIndex.value = null
}
</script>

<template>
  <div class="bke">
    <p v-if="blocks.length === 0" class="bke-empty">
      Tu página está vacía. Agrega tu primer bloque para empezar a armarla.
    </p>

    <ul class="bke-stack">
      <li
        v-for="(block, index) in blocks"
        :key="block.id"
        class="bke-card"
        :data-dragging="dragIndex === index"
        :data-drop="dropIndex === index && dragIndex !== index"
        @dragover.prevent="dropIndex = index"
        @dragleave="dropIndex = null"
        @drop.prevent="onDrop(index)"
      >
        <div class="bke-row">
          <span
            class="bke-handle"
            draggable="true"
            aria-hidden="true"
            @dragstart="dragIndex = index"
            @dragend="dragIndex = null"
            >⠿</span
          >

          <button type="button" class="bke-title" @click="toggle(block.id)">
            <span class="bke-type">
              {{ definition(block.type)?.label ?? block.type }}
            </span>
            <span class="bke-summary">{{ summary(block) }}</span>
          </button>

          <div class="bke-actions">
            <!-- Subir/bajar no son un extra: en tablet son la única forma. -->
            <button
              type="button"
              class="bke-btn"
              :disabled="index === 0"
              title="Subir"
              @click="move(index, index - 1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="bke-btn"
              :disabled="index === blocks.length - 1"
              title="Bajar"
              @click="move(index, index + 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="bke-btn"
              :title="block.enabled === false ? 'Mostrar' : 'Ocultar'"
              @click="update(index, { enabled: block.enabled === false })"
            >
              {{ block.enabled === false ? '👁️‍🗨️' : '👁️' }}
            </button>
            <button type="button" class="bke-btn bke-btn--danger" title="Quitar" @click="remove(index)">
              ✕
            </button>
          </div>
        </div>

        <div v-if="expanded === block.id" class="bke-body">
          <BlockFields
            :block="block"
            :fields="definition(block.type)?.fields ?? []"
            @update="update(index, $event)"
          >
            <template #image-picker="slotProps">
              <slot name="image-picker" v-bind="slotProps" />
            </template>
            <template #images-picker="slotProps">
              <slot name="images-picker" v-bind="slotProps" />
            </template>
            <template #entity-picker="slotProps">
              <slot name="entity-picker" v-bind="slotProps" />
            </template>
          </BlockFields>
        </div>
      </li>
    </ul>

    <div class="bke-add">
      <button v-if="!adding" type="button" class="bke-btn bke-btn--primary" @click="adding = true">
        + Agregar bloque
      </button>

      <div v-else class="bke-catalog">
        <button
          v-for="def in addable"
          :key="def.type"
          type="button"
          class="bke-option"
          @click="onAdd(def.type)"
        >
          <span class="bke-option-label">{{ def.icon }} {{ def.label }}</span>
          <span v-if="def.description" class="bke-option-help">{{ def.description }}</span>
        </button>
        <button type="button" class="bke-btn" @click="adding = false">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bke-stack {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.bke-empty {
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--bke-ink-faint);
}

.bke-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
}

.bke-handle {
  font-size: 1.1rem;
  color: var(--bke-ink-faint);
  user-select: none;
}

.bke-title {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.bke-type {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--bke-ink);
}

.bke-summary {
  display: block;
  font-size: 0.75rem;
  color: var(--bke-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bke-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.bke-body {
  border-top: 1px solid var(--bke-line);
  padding: 0.9rem 0.75rem;
  background: var(--bke-surface-2);
}

.bke-add {
  margin-top: 0.8rem;
}

.bke-catalog {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.bke-option {
  text-align: left;
  border: 1px solid var(--bke-line);
  border-radius: 0.6rem;
  background: var(--bke-surface);
  padding: 0.6rem 0.7rem;
  cursor: pointer;
}

.bke-option:hover {
  border-color: var(--bke-accent);
}

.bke-option-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--bke-ink);
}

.bke-option-help {
  display: block;
  font-size: 0.6875rem;
  color: var(--bke-ink-faint);
}
</style>
