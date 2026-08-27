<script setup lang="ts">
// Fila reusable para el detalle de transacciones del Resumen del dia -
// misma fila tanto en la vista agrupada por canal (showChannel=false, el
// encabezado de la seccion ya dice el canal) como en "todo junto"
// (showChannel=true, cada fila necesita decir de que canal viene). Las
// ventas traen `items` y se pueden colapsar/expandir para no llenar la
// fila de texto cuando la compra tuvo muchos items.
import { ref } from 'vue'

import type { TransactionRow } from '../types'
import { NxButton } from '@/ui'
import { formatCop } from '@/utils/formatCop'

defineProps<{ row: TransactionRow; showChannel: boolean; reversing?: boolean }>()
defineEmits<{ receipt: []; reverse: [] }>()

const expanded = ref(false)

const channelBadgeClass: Record<TransactionRow['channelKey'], string> = {
  sales: 'bg-indigo-50 text-indigo-600',
  services: 'bg-sky-50 text-sky-600',
  layaways: 'bg-purple-50 text-purple-600',
  receivables: 'bg-amber-50 text-amber-600',
}
</script>

<template>
  <div class="py-2.5">
    <!-- flex-col en mobile: el titulo necesita su propio ancho completo, si
    no las badges/monto/boton lo empujan hasta truncarlo a unos pocos
    caracteres (ej. "Cliente Mostrador" -> "Clier..."). Desde sm: para arriba
    hay espacio de sobra para la fila unica de siempre. -->
    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-start gap-1.5">
        <button
          v-if="row.items && row.items.length > 0"
          type="button"
          class="mt-0.5 flex-shrink-0 text-slate-400 hover:text-slate-600"
          :aria-label="expanded ? 'Ocultar items' : 'Ver items'"
          @click="expanded = !expanded"
        >
          <i :class="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-xs" />
        </button>
        <div class="min-w-0">
          <p class="flex flex-wrap items-center gap-1.5 truncate text-sm font-medium text-slate-700">
            <span v-if="showChannel" class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="channelBadgeClass[row.channelKey]">
              {{ row.channelLabel }}
            </span>
            {{ row.title }}
          </p>
          <p class="truncate text-xs text-slate-400">{{ row.subtitle }}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 pl-5 sm:flex-shrink-0 sm:pl-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span v-for="flag in row.flags" :key="flag.label" class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="flag.badgeClass">
            {{ flag.label }}
          </span>
          <span
            v-for="(badge, idx) in row.paymentBadges"
            :key="idx"
            class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
          >
            {{ badge.label }}<template v-if="badge.amount !== undefined"> {{ formatCop(badge.amount) }}</template>
          </span>
        </div>

        <span class="text-sm font-semibold text-slate-900">{{ formatCop(row.amount) }}</span>
        <NxButton v-if="row.receipt" size="sm" variant="outline" icon="pi pi-receipt" @click="$emit('receipt')">Comprobante</NxButton>
        <NxButton v-if="row.reverse" size="sm" variant="outline" icon="pi pi-replay" :loading="reversing" @click="$emit('reverse')">
          {{ row.reverse.label }}
        </NxButton>
      </div>
    </div>

    <div v-if="expanded && row.items && row.items.length > 0" class="ml-5 mt-2 flex flex-col gap-1 border-l border-slate-200 pl-3">
      <div v-for="(item, idx) in row.items" :key="idx" class="flex items-center justify-between text-xs text-slate-500">
        <span>{{ item.name }} <span v-if="item.is_deleted" class="text-red-400">(eliminado)</span> <span class="text-slate-400">x{{ item.quantity }}</span></span>
        <span>{{ formatCop(item.subtotal) }}</span>
      </div>
    </div>
  </div>
</template>
