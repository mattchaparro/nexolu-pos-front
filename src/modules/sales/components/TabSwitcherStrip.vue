<script setup lang="ts">
// Acceso rapido a mesas/cuentas abiertas desde la propia pantalla de
// Vender - calcado de la tira de chips de SalesTerminal.vue en el legacy
// (arriba del buscador de productos): "+ Cuenta" siempre primero, despues
// mesas, despues cuentas por nombre. El cajero vive en esta pantalla y no
// deberia tener que navegar a otra para retomar una cuenta - la pantalla
// separada "Cuentas abiertas" (link "Ver detalle") sigue existiendo para
// gestion mas a fondo (crear/desactivar mesas, ver todo sin filtrar por
// catalogo de productos).
import type { Sale } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { formatCop } from '@/utils/formatCop'

defineProps<{
  tables: BusinessTable[]
  openTabsByName: Sale[]
  openSaleByTable: Map<number, Sale>
  activeMode: 'quick' | 'tab' | 'new-tab'
  activeSaleId: number | null
  pendingTableId: number | null
}>()

const emit = defineEmits<{
  'new-name': []
  'select-table': [table: BusinessTable]
  'select-tab': [tab: Sale]
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex flex-1 gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        class="flex min-w-[64px] shrink-0 flex-col items-center gap-0.5 rounded-xl border-2 px-3 py-2 text-center transition-all active:scale-95"
        :class="
          activeMode === 'new-tab' && !pendingTableId
            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500'
            : 'border-dashed border-slate-300 hover:border-slate-400'
        "
        @click="emit('new-name')"
      >
        <i
          class="pi pi-user-plus text-lg"
          :class="activeMode === 'new-tab' && !pendingTableId ? 'text-indigo-600' : 'text-slate-400'"
        />
        <p
          class="text-[10px]"
          :class="
            activeMode === 'new-tab' && !pendingTableId
              ? 'font-semibold text-indigo-600'
              : 'text-slate-400'
          "
        >
          Cuenta
        </p>
      </button>

      <button
        v-for="table in tables"
        :key="table.id"
        type="button"
        class="flex min-w-[76px] shrink-0 flex-col items-center gap-0.5 rounded-xl border-2 px-3 py-2 text-center transition-all active:scale-95"
        :class="[
          openSaleByTable.has(table.id)
            ? 'border-amber-400 bg-amber-50 hover:bg-amber-100'
            : 'border-slate-200 bg-white hover:border-slate-300',
          (activeMode === 'tab' && activeSaleId === openSaleByTable.get(table.id)?.id) ||
          (activeMode === 'new-tab' && pendingTableId === table.id)
            ? 'ring-2 ring-indigo-500'
            : '',
        ]"
        @click="emit('select-table', table)"
      >
        <i class="pi pi-table text-lg" :class="openSaleByTable.has(table.id) ? 'text-amber-600' : 'text-slate-300'" />
        <p class="text-xs font-semibold" :class="openSaleByTable.has(table.id) ? 'text-amber-900' : 'text-slate-500'">
          {{ table.name }}
        </p>
        <p v-if="openSaleByTable.has(table.id)" class="text-[10px] font-bold text-amber-700">
          {{ formatCop(openSaleByTable.get(table.id)!.total) }}
        </p>
      </button>

      <button
        v-for="tab in openTabsByName"
        :key="tab.id"
        type="button"
        class="flex min-w-[76px] shrink-0 flex-col items-center gap-0.5 rounded-xl border-2 border-indigo-300 bg-indigo-50 px-3 py-2 text-center transition-all hover:bg-indigo-100 active:scale-95"
        :class="activeMode === 'tab' && activeSaleId === tab.id ? 'ring-2 ring-indigo-500' : ''"
        @click="emit('select-tab', tab)"
      >
        <i class="pi pi-user text-lg text-indigo-600" />
        <p class="max-w-[70px] truncate text-xs font-semibold text-indigo-900">
          {{ tab.customer_name || `#${tab.id}` }}
        </p>
        <p class="text-[10px] font-bold text-indigo-700">{{ formatCop(tab.total) }}</p>
      </button>
    </div>

    <RouterLink
      :to="{ name: 'open-tabs.index' }"
      class="hidden shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 sm:inline-flex"
    >
      <i class="pi pi-external-link text-xs" />
      Ver detalle
    </RouterLink>
  </div>
</template>
