<script setup lang="ts">
// Acceso rapido a mesas/cuentas abiertas desde la propia pantalla de
// Vender - calcado de la tira de chips de SalesTerminal.vue en el legacy
// (arriba del buscador de productos): "+ Cuenta" siempre primero, despues
// mesas, despues cuentas por nombre. El cajero vive en esta pantalla y no
// deberia tener que navegar a otra para retomar una cuenta - la pantalla
// separada "Cuentas abiertas" (link "Ver detalle") sigue existiendo para
// gestion mas a fondo (crear/desactivar mesas, ver todo sin filtrar por
// catalogo de productos).
//
// Un solo color de acento (indigo) para "cuenta abierta" sea mesa o por
// nombre - el amarillo separado no aportaba significado, solo ruido. La
// seleccion se distingue con relleno solido, no combinando borde + ring
// (esa combinacion se veia recargada).
import { computed, ref } from 'vue'

import { NxInput } from '@/ui'
import type { Sale } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{
  tables: BusinessTable[]
  openTabsByName: Sale[]
  openSaleByTable: Map<number, Sale>
  activeMode: 'quick' | 'tab' | 'new-tab'
  activeSaleId: number | null
  pendingTableId: number | null
  // Total de los items aun no guardados (carrito nuevo) de la cuenta que
  // se esta editando ahora mismo - se suma al total ya persistido para
  // que el chip activo refleje de inmediato lo que se acaba de tocar en
  // la grilla, en vez de quedarse "quieto" hasta guardar.
  pendingCartTotal: number
}>()

const emit = defineEmits<{
  'new-name': []
  'select-table': [table: BusinessTable]
  'select-tab': [tab: Sale]
}>()

// Buscador de mesas/cuentas, restaurado del legacy (SalesTerminal.vue:
// "Buscar mesa, cliente o número de cuenta…"). La tira sola obliga a
// scrollear entre todas las cuentas; en un negocio con muchas mesas y
// cuentas por nombre eso no escala. Filtra en memoria las mismas dos listas
// que ya llegan por props, sin pedir nada al backend.
const search = ref('')

// Siempre visible mientras haya al menos una mesa o cuenta para filtrar,
// igual que el legacy lo mostraba siempre en su panel de cuentas. Solo se
// oculta en el caso degenerado sin nada que buscar (0 mesas y 0 cuentas),
// donde el input no filtraria nada.
const showSearch = computed(() => props.tables.length > 0 || props.openTabsByName.length > 0)

function matchesTab(tab: Sale, q: string): boolean {
  return (
    (tab.customer_name ?? '').toLowerCase().includes(q) ||
    (tab.customer_phone ?? '').toLowerCase().includes(q) ||
    String(tab.id).includes(q)
  )
}

const filteredTables = computed<BusinessTable[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) {
    return props.tables
  }
  return props.tables.filter((table) => {
    if (table.name.toLowerCase().includes(q)) {
      return true
    }
    // Tambien se puede buscar una mesa por el cliente de su cuenta abierta.
    const sale = props.openSaleByTable.get(table.id)
    return !!sale && matchesTab(sale, q)
  })
})

const filteredOpenTabsByName = computed<Sale[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) {
    return props.openTabsByName
  }
  return props.openTabsByName.filter((tab) => matchesTab(tab, q))
})

const noResults = computed(
  () =>
    search.value.trim() !== '' &&
    filteredTables.value.length === 0 &&
    filteredOpenTabsByName.value.length === 0,
)

// Number(): sale.total llega como string desde el backend (cast decimal:2
// de Laravel se serializa como string en JSON) - sumarlo directo con "+"
// concatenaria texto en vez de sumar.

/**
 * Lo que FALTA cobrar de la cuenta (total - abonos), no el total. Mejora
 * deliberada sobre el legacy (decision del usuario, 2026-09-03): alla el
 * chip mostraba el total y el saldo solo aparecia al entrar al modal de
 * cobro; con abonos registrados eso le mostraba al cajero una deuda que el
 * cliente ya no tiene. balance_due lo calcula el backend cuando la lista
 * carga los abonos; el fallback resta localmente por si llegara una Sale
 * sin esa relacion cargada.
 */
function remainingOf(sale: Sale): number {
  if (sale.balance_due !== null && sale.balance_due !== undefined) {
    return Number(sale.balance_due)
  }
  const paid = (sale.partial_payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
  return Number(sale.total) - paid
}

function tableTotal(table: BusinessTable): number {
  const sale = props.openSaleByTable.get(table.id)
  if (!sale) {
    return 0
  }
  const isActive = props.activeMode === 'tab' && props.activeSaleId === sale.id
  return remainingOf(sale) + (isActive ? props.pendingCartTotal : 0)
}

function tabTotal(tab: Sale): number {
  const isActive = props.activeMode === 'tab' && props.activeSaleId === tab.id
  return remainingOf(tab) + (isActive ? props.pendingCartTotal : 0)
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="showSearch">
      <NxInput
        v-model="search"
        size="sm"
        icon="pi pi-search"
        placeholder="Buscar mesa, cliente o número de cuenta…"
        clearable
        blur-after-typing
      />
      <p v-if="noResults" class="mt-1 text-xs text-amber-700">
        Ninguna mesa o cuenta coincide con "{{ search.trim() }}".
      </p>
    </div>

    <div class="flex items-center gap-2">
      <div class="flex flex-1 gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        class="flex min-w-[64px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-center transition-colors active:scale-95"
        :class="
          activeMode === 'new-tab' && !pendingTableId
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-dashed border-slate-300 text-slate-500 hover:border-slate-400'
        "
        @click="emit('new-name')"
      >
        <i
          class="pi pi-user-plus text-lg"
          :class="activeMode === 'new-tab' && !pendingTableId ? 'text-white' : 'text-slate-400'"
        />
        <p class="text-[10px] font-medium">Cuenta</p>
      </button>

      <button
        v-for="table in filteredTables"
        :key="table.id"
        type="button"
        class="flex min-w-[76px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-center transition-colors active:scale-95"
        :class="
          (activeMode === 'tab' && activeSaleId === openSaleByTable.get(table.id)?.id) ||
          (activeMode === 'new-tab' && pendingTableId === table.id)
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : openSaleByTable.has(table.id)
              ? 'border-indigo-200 bg-indigo-50 text-indigo-900 hover:border-indigo-300'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
        "
        @click="emit('select-table', table)"
      >
        <i
          class="pi pi-table text-lg"
          :class="
            (activeMode === 'tab' && activeSaleId === openSaleByTable.get(table.id)?.id) ||
            (activeMode === 'new-tab' && pendingTableId === table.id)
              ? 'text-white'
              : openSaleByTable.has(table.id)
                ? 'text-indigo-500'
                : 'text-slate-300'
          "
        />
        <p class="text-xs font-semibold">{{ table.name }}</p>
        <p v-if="openSaleByTable.has(table.id)" class="text-[10px] font-bold">
          {{ formatCop(tableTotal(table)) }}
        </p>
      </button>

      <button
        v-for="tab in filteredOpenTabsByName"
        :key="tab.id"
        type="button"
        class="flex min-w-[76px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-center transition-colors active:scale-95"
        :class="
          activeMode === 'tab' && activeSaleId === tab.id
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-indigo-200 bg-indigo-50 text-indigo-900 hover:border-indigo-300'
        "
        @click="emit('select-tab', tab)"
      >
        <i
          class="pi pi-user text-lg"
          :class="activeMode === 'tab' && activeSaleId === tab.id ? 'text-white' : 'text-indigo-500'"
        />
        <p class="max-w-[70px] truncate text-xs font-semibold">{{ tab.customer_name || `#${tab.id}` }}</p>
        <p class="text-[10px] font-bold">{{ formatCop(tabTotal(tab)) }}</p>
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
  </div>
</template>
