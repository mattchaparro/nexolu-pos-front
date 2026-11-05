<script setup lang="ts">
// Una sola linea con el nombre de la cuenta (la mesa, o el nombre si es por
// nombre), su nota (quien esta en la mesa) y el cambio de mesa (la gente se
// movio). Al editar la nota o elegir la mesa, el campo ocupa esa misma linea
// con su boton a la derecha. Lo usan Cuentas abiertas y Vender: items,
// abonos y nota se van con la cuenta a la mesa nueva y la de antes queda libre.
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

const name = computed(() => {
  const table = tablesQuery.data.value?.find((t) => t.id === props.sale.table_id)
  if (table) {
    return table.name
  }
  return props.sale.table_id ? 'Mesa' : props.sale.customer_name || `Cuenta #${props.sale.id}`
})

/** Mesas activas sin cuenta abierta, sin contar la actual. */
const freeTables = computed(() => {
  const occupied = new Set((openTabsQuery.data.value ?? []).map((s) => s.table_id).filter(Boolean))
  return (tablesQuery.data.value ?? []).filter((t) => t.is_active && !occupied.has(t.id) && t.id !== props.sale.table_id)
})
const canMove = computed(() => Boolean(props.sale.table_id) || freeTables.value.length > 0)

const mode = ref<'view' | 'note' | 'move'>('view')
const noteDraft = ref('')
const targetTableId = ref<number | null>(null)

// Otra cuenta: se cierra cualquier edicion a medias.
watch(
  () => props.sale.id,
  () => {
    mode.value = 'view'
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
  mode.value = 'note'
}

function startMove(): void {
  targetTableId.value = null
  mode.value = 'move'
}

async function saveNote(): Promise<void> {
  try {
    await mutation.mutateAsync({ notes: noteDraft.value.trim() || null })
    mode.value = 'view'
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar la nota.'), 'error')
  }
}

async function moveTable(): Promise<void> {
  if (!targetTableId.value) {
    return
  }
  const target = freeTables.value.find((t) => t.id === targetTableId.value)?.name
  try {
    await mutation.mutateAsync({ table_id: targetTableId.value })
    mode.value = 'view'
    notify(target ? `La cuenta pasó a ${target}` : 'Cuenta cambiada de mesa')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos cambiar la cuenta de mesa.'), 'error')
  }
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <span class="shrink-0 font-semibold text-slate-900">{{ name }}</span>

    <!-- Nota -->
    <template v-if="mode === 'note'">
      <NxInput
        v-model="noteDraft"
        class="min-w-0 flex-1"
        placeholder="Quién está en la mesa"
        size="sm"
        @keyup.enter="saveNote"
      />
      <NxButton size="sm" class="shrink-0" :loading="mutation.isPending.value" @click="saveNote">Guardar</NxButton>
      <button
        type="button"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
        title="Cancelar"
        :disabled="mutation.isPending.value"
        @click="mode = 'view'"
      >
        <i class="pi pi-times text-sm" />
      </button>
    </template>

    <!-- Cambio de mesa -->
    <template v-else-if="mode === 'move'">
      <NxSelect
        :model-value="targetTableId"
        :options="freeTables"
        option-label="name"
        option-value="id"
        :placeholder="freeTables.length > 0 ? 'Pasar a…' : 'No hay mesas libres'"
        size="sm"
        filter
        class="min-w-0 flex-1"
        @update:model-value="targetTableId = $event as number | null"
      />
      <NxButton
        size="sm"
        class="shrink-0"
        :disabled="!targetTableId"
        :loading="mutation.isPending.value"
        @click="moveTable"
      >
        Guardar
      </NxButton>
      <button
        type="button"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
        title="Cancelar"
        :disabled="mutation.isPending.value"
        @click="mode = 'view'"
      >
        <i class="pi pi-times text-sm" />
      </button>
    </template>

    <template v-else>
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-sm font-normal hover:bg-slate-50"
        :title="sale.notes ? 'Editar nota' : 'Agregar nota'"
        @click="startNote"
      >
        <i class="pi pi-pencil shrink-0 text-xs text-slate-400" />
        <span v-if="sale.notes" class="truncate text-slate-600">{{ sale.notes }}</span>
        <span v-else class="truncate text-indigo-600">Agregar nota</span>
      </button>
      <button
        v-if="canMove"
        type="button"
        class="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        @click="startMove"
      >
        <i class="pi pi-arrow-right-arrow-left text-[11px]" />
        {{ sale.table_id ? 'Cambiar mesa' : 'Pasar a mesa' }}
      </button>
    </template>
  </div>
</template>
