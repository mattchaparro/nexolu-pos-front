<script setup lang="ts">
// Lista editable de items YA guardados de una cuenta abierta (sync
// inmediato al backend via useActiveTabItemActions) - +/-/cantidad/
// subtotal/quitar por fila. Extraida de ActiveTabItemsPanel.vue para
// reusarla tambien en TabInProgressPanel.vue (panel embebido en Vender):
// antes esos items se mostraban ahi como chips de solo lectura y para
// editarlos había que salir a la pantalla completa de Cuentas abiertas -
// el cajero no debería tener que salir de Vender para eso.
import type { SaleItem } from '@/types/sale'
import { formatCop } from '@/utils/formatCop'

defineProps<{
  items: SaleItem[]
  syncing: boolean
}>()

const emit = defineEmits<{
  'increment-item': [item: SaleItem]
  'decrement-item': [item: SaleItem]
  'remove-item': [item: SaleItem]
}>()
</script>

<template>
  <div class="divide-y divide-slate-100">
    <div v-for="item in items" :key="item.id" class="flex items-center gap-2 py-2 text-sm">
      <span class="min-w-0 flex-1 truncate text-slate-700">{{ item.product.name }}</span>
      <!-- Sin :disabled="syncing": el ajuste es optimista (la UI cambia al
           instante y el servidor confirma por detras, ver
           useActiveTabItemActions), asi que bloquear los botones durante el
           round-trip solo hacia sentir lento cada clic. El guard de stock
           se mantiene. -->
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 disabled:opacity-40"
          @click="emit('decrement-item', item)"
        >
          <i class="pi pi-minus text-xs" />
        </button>
        <span class="w-5 text-center text-xs font-bold">{{ item.quantity }}</span>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 disabled:opacity-40"
          :disabled="item.product.track_stock && item.product.stock <= 0"
          @click="emit('increment-item', item)"
        >
          <i class="pi pi-plus text-xs" />
        </button>
      </div>
      <span class="min-w-[64px] shrink-0 text-right font-semibold text-slate-900">
        {{ formatCop(item.subtotal) }}
      </span>
      <button
        type="button"
        class="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-40"
        @click="emit('remove-item', item)"
      >
        <i class="pi pi-trash text-sm" />
      </button>
    </div>
  </div>
</template>
