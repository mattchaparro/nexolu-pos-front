<script setup lang="ts">
// Dibuja los campos de un bloque a partir de su esquema. Es lo que hace que
// agregar un tipo de bloque sea escribir una definición y nada más.
import type { Block, FieldDefinition } from './types'

const props = defineProps<{ block: Block; fields: FieldDefinition[] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

function value(field: FieldDefinition): unknown {
  return props.block[field.key]
}

function set(field: FieldDefinition, raw: unknown): void {
  emit('update', { [field.key]: raw })
}

/** Los elementos de un campo `list`, siempre como array. */
function items(field: FieldDefinition): Record<string, unknown>[] {
  const current = props.block[field.key]
  return Array.isArray(current) ? (current as Record<string, unknown>[]) : []
}

function addItem(field: FieldDefinition): void {
  const current = items(field)
  if (field.max !== undefined && current.length >= field.max) {
    return
  }
  set(field, [...current, {}])
}

function updateItem(field: FieldDefinition, index: number, key: string, raw: unknown): void {
  set(
    field,
    items(field).map((item, i) => (i === index ? { ...item, [key]: raw } : item)),
  )
}

function removeItem(field: FieldDefinition, index: number): void {
  set(
    field,
    items(field).filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="bke-fields">
    <div v-for="field in fields" :key="field.key" class="bke-field">
      <label class="bke-label">{{ field.label }}</label>

      <!-- Imagen y entidades las resuelve el anfitrión: el paquete no sabe
           de dónde salen las fotos ni qué es un producto. -->
      <slot
        v-if="field.kind === 'image'"
        name="image-picker"
        :value="value(field)"
        :on-select="(id: unknown) => set(field, id)"
      />

      <slot
        v-else-if="field.kind === 'images'"
        name="images-picker"
        :value="value(field)"
        :max="field.max"
        :on-select="(ids: unknown) => set(field, ids)"
      />

      <slot
        v-else-if="field.kind === 'entities'"
        name="entity-picker"
        :value="value(field)"
        :max="field.max"
        :on-select="(ids: unknown) => set(field, ids)"
      />

      <textarea
        v-else-if="field.kind === 'textarea'"
        class="bke-input"
        rows="4"
        :value="(value(field) as string) ?? ''"
        :placeholder="field.placeholder"
        :maxlength="field.maxLength"
        @input="set(field, ($event.target as HTMLTextAreaElement).value)"
      />

      <select
        v-else-if="field.kind === 'select'"
        class="bke-input"
        :value="(value(field) as string) ?? ''"
        @change="set(field, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- Lista de sub-elementos: preguntas, testimonios, cifras… -->
      <div v-else-if="field.kind === 'list'" class="bke-list">
        <div v-for="(item, index) in items(field)" :key="index" class="bke-list-item">
          <div class="bke-list-fields">
            <div v-for="sub in field.itemFields ?? []" :key="sub.key" class="bke-field">
              <label class="bke-label bke-label--sm">{{ sub.label }}</label>
              <textarea
                v-if="sub.kind === 'textarea'"
                class="bke-input"
                rows="2"
                :value="(item[sub.key] as string) ?? ''"
                :placeholder="sub.placeholder"
                :maxlength="sub.maxLength"
                @input="updateItem(field, index, sub.key, ($event.target as HTMLTextAreaElement).value)"
              />
              <input
                v-else
                class="bke-input"
                type="text"
                :value="(item[sub.key] as string) ?? ''"
                :placeholder="sub.placeholder"
                :maxlength="sub.maxLength"
                @input="updateItem(field, index, sub.key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
          <button type="button" class="bke-btn bke-btn--danger" @click="removeItem(field, index)">
            Quitar
          </button>
        </div>

        <button
          type="button"
          class="bke-btn"
          :disabled="field.max !== undefined && items(field).length >= field.max"
          @click="addItem(field)"
        >
          + {{ field.addLabel ?? 'Agregar' }}
        </button>
      </div>

      <input
        v-else
        class="bke-input"
        :type="field.kind === 'url' ? 'url' : 'text'"
        :value="(value(field) as string) ?? ''"
        :placeholder="field.placeholder"
        :maxlength="field.maxLength"
        @input="set(field, ($event.target as HTMLInputElement).value)"
      />

      <p v-if="field.help" class="bke-help">{{ field.help }}</p>
    </div>
  </div>
</template>

<style scoped>
.bke-fields {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.bke-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.bke-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bke-ink-soft);
}

.bke-label--sm {
  font-size: 0.6875rem;
}

.bke-help {
  font-size: 0.6875rem;
  color: var(--bke-ink-faint);
}

.bke-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.bke-list-item {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  padding: 0.7rem;
  border: 1px solid var(--bke-line);
  border-radius: 0.6rem;
  background: var(--bke-surface-2);
}

.bke-list-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
</style>
