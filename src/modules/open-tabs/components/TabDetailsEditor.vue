<script setup lang="ts">
// Nota de la cuenta (quien esta en la mesa) y cambio de mesa (la gente se
// movio). Lo usan Cuentas abiertas y Vender: los items, abonos y la nota se
// van con la cuenta a la mesa nueva, y la de antes queda libre.
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Sale } from '@/types/sale'
import { NxButton, NxInput, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useOpenTabsList } from '../composables/useOpenTabsList'
import { useTables } from '../composables/useTables'
import { updateOpenTab } from '../services/openTabsService'

const props = defineProps<{ sale: Sale }>()
const emit = defineEmits<{ updated: [sale: Sale] }>()

const queryClient = useQueryClient()
const { notify } = useSystemAlert()
const tablesQuery = useTables()
const openTabsQuery = useOpenTabsList()

const tableName = computed(() => tablesQuery.data.value?.find((t) => t.id === props.sale.table_id)?.name ?? null)

/** Mesas activas sin cuenta abierta, sin contar la actual. */
const freeTables = computed(() => {
  const occupied = new Set((openTabsQuery.data.value ?? []).map((s) => s.table_id).filter(Boolean))
  return (tablesQuery.data.value ?? []).filter((t) => t.is_active && !occupied.has(t.id) && t.id !== props.sale.table_id)
})

const editingNote = ref(false)
const noteDraft = ref('')
const moving = ref(false)
const targetTableId = ref<number | null>(null)

// Otra cuenta: se cierra cualquier edicion a medias.
watch(
  () => props.sale.id,
  () => {
    editingNote.value = false
    moving.value = false
    targetTableId.value = null
  },
)

const mutation = useMutation({
  mutationFn: (payload: { notes?: string | null; table_id?: number }) => updateOpenTab(props.sale.id, payload),
  onSuccess: (sale) => {
    queryClient.invalidateQueries({ queryKey: ['open-tabs'] })
    queryClient.invalidateQueries({ queryKey: ['tables'] })
    emit('updated', sale)
  },
})

function startNote(): void {
  noteDraft.value = props.sale.notes ?? ''
  editingNote.value = true
}

async function saveNote(): Promise<void> {
  try {
    await mutation.mutateAsync({ notes: noteDraft.value.trim() || null })
    editingNote.value = false
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar la nota.'), 'error')
  }
}

async function moveTable(): Promise<void> {
  if (!targetTableId.value) {
    return
  }
  const name = freeTables.value.find((t) => t.id === targetTableId.value)?.name
  try {
    await mutation.mutateAsync({ table_id: targetTableId.value })
    moving.value = false
    targetTableId.value = null
    notify(name ? `La cuenta pasó a ${name}` : 'Cuenta cambiada de mesa')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos cambiar la cuenta de mesa.'), 'error')
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Nota -->
    <div v-if="editingNote" class="flex flex-col gap-2">
      <NxInput v-model="noteDraft" label="Nota de la cuenta" placeholder="Ej: Juan y su familia" size="sm" />
      <div class="flex gap-2">
        <NxButton size="sm" class="flex-1" :loading="mutation.isPending.value" @click="saveNote">Guardar nota</NxButton>
        <NxButton size="sm" variant="outline" :disabled="mutation.isPending.value" @click="editingNote = false">
          Cancelar
        </NxButton>
      </div>
    </div>
    <button
      v-else
      type="button"
      class="flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
      :title="sale.notes ? 'Editar nota' : 'Agregar nota'"
      @click="startNote"
    >
      <i class="pi pi-pencil mt-0.5 text-xs text-slate-400" />
      <span v-if="sale.notes" class="min-w-0 break-words text-slate-700">{{ sale.notes }}</span>
      <span v-else class="text-indigo-600">Agregar nota (quién está en la mesa)</span>
    </button>

    <!-- Cambio de mesa: solo cuentas en una mesa, o por nombre si hay mesas -->
    <template v-if="sale.table_id || freeTables.length > 0">
      <div v-if="moving" class="flex flex-col gap-2 rounded-lg border border-slate-200 p-2">
        <NxSelect
          :model-value="targetTableId"
          :options="freeTables"
          option-label="name"
          option-value="id"
          :label="sale.table_id ? 'Pasar a la mesa' : 'Pasar a una mesa'"
          size="sm"
          filter
          @update:model-value="targetTableId = $event as number | null"
        />
        <p v-if="freeTables.length === 0" class="text-xs text-amber-700">No hay mesas libres.</p>
        <div class="flex gap-2">
          <NxButton size="sm" class="flex-1" :disabled="!targetTableId" :loading="mutation.isPending.value" @click="moveTable">
            Cambiar de mesa
          </NxButton>
          <NxButton size="sm" variant="outline" :disabled="mutation.isPending.value" @click="moving = false">Cancelar</NxButton>
        </div>
      </div>
      <button
        v-else
        type="button"
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
        @click="moving = true"
      >
        <i class="pi pi-arrow-right-arrow-left text-xs text-slate-400" />
        <span v-if="tableName" class="text-slate-700">{{ tableName }}</span>
        <span class="text-indigo-600">{{ sale.table_id ? 'Cambiar de mesa' : 'Pasar a una mesa' }}</span>
      </button>
    </template>
  </div>
</template>
