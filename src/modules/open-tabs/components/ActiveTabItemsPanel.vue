<script setup lang="ts">
import type { Sale, SaleItem } from '@/types/sale'
import { NxButton } from '@/ui'
import { formatCop } from '@/utils/formatCop'

defineProps<{
  sale: Sale
  syncing: boolean
  /** Ya hay abonos registrados: bloquea eliminar la cuenta. */
  hasPartialPayments: boolean
}>()

const emit = defineEmits<{
  'increment-item': [item: SaleItem]
  'decrement-item': [item: SaleItem]
  'remove-item': [item: SaleItem]
  close: []
  destroy: []
}>()
</script>

<template>
  <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 class="mb-2 flex items-center gap-2 font-bold text-slate-900">
      <i class="pi pi-file text-amber-600" />
      {{ sale.table_id ? `Mesa` : sale.customer_name || `Cuenta #${sale.id}` }}
      <span class="ml-auto text-lg font-bold text-emerald-600">{{ formatCop(sale.total) }}</span>
    </h3>

    <div class="divide-y divide-slate-100">
      <div v-for="item in sale.items" :key="item.id" class="flex items-center gap-2 py-2 text-sm">
        <span class="min-w-0 flex-1 truncate text-slate-700">{{ item.product.name }}</span>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 disabled:opacity-40"
            :disabled="syncing"
            @click="emit('decrement-item', item)"
          >
            <i class="pi pi-minus text-xs" />
          </button>
          <span class="w-5 text-center text-xs font-bold">{{ item.quantity }}</span>
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 disabled:opacity-40"
            :disabled="syncing || (item.product.track_stock && item.product.stock <= 0)"
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
          :disabled="syncing"
          @click="emit('remove-item', item)"
        >
          <i class="pi pi-trash text-sm" />
        </button>
      </div>
    </div>

    <div class="mt-3 flex flex-col gap-2 sm:flex-row">
      <NxButton class="flex-1" icon="pi pi-money-bill" @click="emit('close')">Cobrar</NxButton>
      <NxButton
        variant="outline"
        :disabled="hasPartialPayments"
        icon="pi pi-trash"
        @click="emit('destroy')"
      >
        Eliminar cuenta
      </NxButton>
    </div>
    <p v-if="hasPartialPayments" class="mt-2 text-xs text-amber-700">
      No puedes eliminar la cuenta mientras haya pagos parciales.
    </p>
  </div>
</template>
