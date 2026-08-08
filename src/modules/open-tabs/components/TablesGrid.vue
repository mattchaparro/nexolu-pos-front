<script setup lang="ts">
import type { Sale } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { formatCop } from '@/utils/formatCop'

defineProps<{
  tables: BusinessTable[]
  /** Cuenta abierta de cada mesa ocupada, por table_id. */
  openSaleByTable: Map<number, Sale>
}>()

const emit = defineEmits<{ select: [table: BusinessTable] }>()
</script>

<template>
  <div class="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
    <button
      v-for="table in tables"
      :key="table.id"
      type="button"
      class="flex flex-col items-center gap-0.5 rounded-xl border-2 px-1 py-2 text-center transition-all active:scale-95"
      :class="
        openSaleByTable.has(table.id)
          ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      "
      @click="emit('select', table)"
    >
      <i
        class="pi pi-table text-xl leading-none"
        :class="openSaleByTable.has(table.id) ? 'text-indigo-500' : 'text-slate-300'"
      />
      <p
        class="text-[11px] font-bold leading-tight"
        :class="openSaleByTable.has(table.id) ? 'text-indigo-900' : 'text-slate-500'"
      >
        {{ table.name }}
      </p>
      <p v-if="openSaleByTable.has(table.id)" class="text-[10px] font-semibold leading-tight text-indigo-700">
        {{ formatCop(openSaleByTable.get(table.id)!.total) }}
      </p>
      <p v-else class="text-[10px] leading-tight text-slate-300">Libre</p>
    </button>
  </div>
</template>
