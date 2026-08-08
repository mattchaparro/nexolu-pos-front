<script setup lang="ts">
import { ref } from 'vue'

import type { BusinessTable } from '@/types/table'
import { NxButton, NxInput, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useTableMutations } from '../composables/useTableMutations'

defineProps<{
  modelValue: boolean
  tables: BusinessTable[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation, deleteMutation } = useTableMutations()

const newTableName = ref('')
const error = ref<string | null>(null)

async function addTable(): Promise<void> {
  const name = newTableName.value.trim()
  if (!name) {
    return
  }
  error.value = null
  try {
    await createMutation.mutateAsync({ name })
    newTableName.value = ''
  } catch (err) {
    error.value = extractErrorMessage(err, 'No pudimos crear la mesa.')
  }
}

async function toggleActive(table: BusinessTable): Promise<void> {
  await updateMutation.mutateAsync({ id: table.id, payload: { is_active: !table.is_active } })
}

async function removeTable(table: BusinessTable): Promise<void> {
  error.value = null
  try {
    await deleteMutation.mutateAsync(table.id)
  } catch (err) {
    error.value = extractErrorMessage(err, 'No pudimos eliminar la mesa.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    title="Mesas"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>

      <div v-if="tables.length === 0" class="py-4 text-center text-sm text-slate-400">
        Todavía no hay mesas configuradas.
      </div>
      <ul v-else class="divide-y divide-slate-100">
        <li v-for="table in tables" :key="table.id" class="flex items-center gap-2 py-2">
          <span class="flex-1 text-sm font-medium" :class="table.is_active ? 'text-slate-900' : 'text-slate-400'">
            {{ table.name }}
          </span>
          <span v-if="table.has_open_sale" class="text-[10px] font-semibold text-indigo-600">Ocupada</span>
          <button
            type="button"
            class="text-xs font-medium text-slate-400 hover:text-indigo-600"
            @click="toggleActive(table)"
          >
            {{ table.is_active ? 'Desactivar' : 'Activar' }}
          </button>
          <button
            type="button"
            class="text-slate-300 hover:text-red-500 disabled:opacity-30"
            :disabled="table.has_open_sale"
            title="Eliminar"
            @click="removeTable(table)"
          >
            <i class="pi pi-trash text-sm" />
          </button>
        </li>
      </ul>

      <form class="flex items-end gap-2 border-t border-slate-200 pt-3" @submit.prevent="addTable">
        <NxInput v-model="newTableName" label="Nombre de la mesa" size="sm" class="flex-1" />
        <NxButton size="sm" type="submit" :loading="createMutation.isPending.value">Agregar</NxButton>
      </form>
    </div>
  </NxModal>
</template>
