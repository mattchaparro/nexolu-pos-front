<script setup lang="ts">
import type { Sale, SaleItem } from '@/types/sale'
import { NxButton } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import SavedTabItemsList from './SavedTabItemsList.vue'

const props = defineProps<{
  sale: Sale
  syncing: boolean
  /** Ya hay abonos registrados: bloquea eliminar la cuenta. */
  hasPartialPayments: boolean
  // Borrador de items (semantica legacy: los +/- se acumulan local y solo
  // persisten al confirmar) - ver useActiveTabItemActions.
  draftItems: SaleItem[]
  hasDraftChanges: boolean
  draftTotalDelta: number
}>()

const emit = defineEmits<{
  'increment-item': [item: SaleItem]
  'decrement-item': [item: SaleItem]
  'remove-item': [item: SaleItem]
  'confirm-draft': []
  'discard-draft': []
  close: []
  destroy: []
}>()
</script>

<template>
  <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 class="mb-2 flex items-center gap-2 font-bold text-slate-900">
      <i class="pi pi-file text-indigo-600" />
      {{ sale.table_id ? `Mesa` : sale.customer_name || `Cuenta #${sale.id}` }}
      <span class="ml-auto text-lg font-bold text-emerald-600">
        {{ formatCop(Number(sale.total) + props.draftTotalDelta) }}
      </span>
    </h3>

    <SavedTabItemsList
      :items="draftItems"
      :syncing="syncing"
      @increment-item="emit('increment-item', $event)"
      @decrement-item="emit('decrement-item', $event)"
      @remove-item="emit('remove-item', $event)"
    />

    <!-- Cambios sin confirmar: se persisten todos juntos o se descartan,
         como el "Guardar cambios" del legacy. -->
    <div v-if="hasDraftChanges" class="mt-3 flex gap-2">
      <NxButton class="flex-1" variant="dark" :loading="syncing" @click="emit('confirm-draft')">
        Confirmar cambios
      </NxButton>
      <NxButton variant="outline" :disabled="syncing" @click="emit('discard-draft')">Descartar</NxButton>
    </div>

    <div class="mt-3 flex flex-col gap-2 sm:flex-row">
      <NxButton class="flex-1" icon="pi pi-money-bill" :disabled="hasDraftChanges" @click="emit('close')">
        Cobrar
      </NxButton>
      <NxButton
        variant="outline"
        :disabled="hasPartialPayments"
        icon="pi pi-trash"
        @click="emit('destroy')"
      >
        Eliminar cuenta
      </NxButton>
    </div>
    <p v-if="hasDraftChanges" class="mt-2 text-xs text-amber-700">
      Confirma o descarta los cambios antes de cobrar.
    </p>
    <p v-if="hasPartialPayments" class="mt-2 text-xs text-amber-700">
      No puedes eliminar la cuenta mientras haya pagos parciales.
    </p>
  </div>
</template>
