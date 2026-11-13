<script setup lang="ts">
// Comandera - puerto de Admin/Sales/KitchenBoard.vue del legacy: 3 columnas
// fijas (no Kanban con drag/drop, click para avanzar) que se arman
// filtrando los items de cada comanda por su kitchen_status - una misma
// venta puede aparecer en mas de una columna con subconjuntos distintos de
// items (ver KitchenBoardService::syncSaleStatus() en el backend). Se
// refresca sola cada 3s (mismo intervalo que el polling del legacy) porque
// el backend no tiene websockets para esto.
import { computed } from 'vue'

import type { KitchenStatus, KitchenTicket, KitchenTicketItem } from '@/types/kitchenTicket'
import { NxButton } from '@/ui'

import { useKitchenMutations } from '../composables/useKitchenMutations'
import { useKitchenTickets } from '../composables/useKitchenTickets'

interface Column {
  status: KitchenStatus
  label: string
  badgeClass: string
}

const COLUMNS: Column[] = [
  { status: 'pending', label: 'Pendientes', badgeClass: 'bg-blue-50 text-blue-700' },
  { status: 'preparing', label: 'En preparación', badgeClass: 'bg-amber-50 text-amber-700' },
  { status: 'ready', label: 'Listos para salida', badgeClass: 'bg-emerald-50 text-emerald-700' },
]

interface ColumnCard {
  ticket: KitchenTicket
  items: KitchenTicketItem[]
}

const ticketsQuery = useKitchenTickets()

function cardsFor(status: KitchenStatus): ColumnCard[] {
  const tickets = ticketsQuery.data.value ?? []
  return tickets
    .map((ticket) => ({ ticket, items: ticket.items.filter((item) => item.kitchen_status === status) }))
    .filter((card) => card.items.length > 0)
}

const columnCards = computed(() => COLUMNS.map((column) => ({ column, cards: cardsFor(column.status) })))

const { updateStatusMutation, dispatchMutation } = useKitchenMutations()

function advance(ticket: KitchenTicket, items: KitchenTicketItem[], status: KitchenStatus): void {
  updateStatusMutation.mutate({
    saleId: ticket.id,
    payload: { kitchen_status: status, sale_item_ids: items.map((item) => item.id) },
  })
}

function ticketLabel(ticket: KitchenTicket): string {
  return ticket.table_name || ticket.customer_name || `Pedido #${ticket.id}`
}

// Un pedido online sale de la comandera al despacharse (no se cobra aquí):
// solo cuando toda la comanda está lista, para no despachar media orden.
function canDispatch(ticket: KitchenTicket, status: KitchenStatus): boolean {
  return ticket.online_order !== null && status === 'ready' && ticket.kitchen_status === 'ready'
}

function dispatchLabel(ticket: KitchenTicket): string {
  return ticket.online_order?.is_pickup ? 'Entregado al cliente' : 'Salió a domicilio'
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <i class="pi pi-list text-lg text-indigo-600" />
      <h1 class="text-lg font-bold text-slate-900">Comandera</h1>
    </div>

    <div v-if="ticketsQuery.isPending.value" class="h-96 animate-pulse rounded-xl bg-slate-100" />

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div v-for="{ column, cards } in columnCards" :key="column.status" class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">{{ column.label }}</h2>
          <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="column.badgeClass">{{ cards.length }}</span>
        </div>

        <p v-if="cards.length === 0" class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
          Sin comandas aquí.
        </p>

        <div v-for="card in cards" :key="`${card.ticket.id}-${column.status}`" class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div class="mb-2 flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ ticketLabel(card.ticket) }}</p>
              <p class="text-xs text-slate-400">
                <template v-if="card.ticket.online_order">Pedido online #{{ card.ticket.online_order.number }}</template>
                <template v-else>#{{ card.ticket.id }}</template>
                · {{ card.ticket.created_at }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-0.5 text-xs font-semibold">
              <span v-if="card.ticket.is_delivery" class="text-indigo-600">Domicilio</span>
              <span v-else-if="card.ticket.online_order" class="text-slate-500">Recoge</span>
              <span v-if="card.ticket.online_order?.is_paid_online" class="text-emerald-600">Pagado en línea</span>
            </div>
          </div>

          <!-- La nota va ANTES de los productos: es lo que no se puede pasar por alto
               al cocinar (alergias, "sin cebolla") o al despachar (dirección). -->
          <p
            v-if="card.ticket.notes"
            class="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800"
          >
            <span class="font-semibold">Nota:</span> {{ card.ticket.notes }}
          </p>
          <p v-if="card.ticket.customer_phone && card.ticket.is_delivery" class="mb-2 text-xs text-slate-500">
            <i class="pi pi-phone mr-1 text-[10px]" />{{ card.ticket.customer_phone }}
          </p>

          <ul class="mb-3 flex flex-col gap-1">
            <li v-for="item in card.items" :key="item.id" class="text-sm text-slate-700">
              <div class="flex items-center gap-1.5">
                <span class="font-semibold text-slate-500">x{{ item.quantity }}</span>
                {{ item.name }}
                <span v-if="item.is_deleted" class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Eliminado</span>
              </div>
              <p v-if="item.options.length" class="pl-6 text-xs font-medium text-amber-700">
                {{ item.options.map((o) => (o.quantity > 1 ? `${o.name} ×${o.quantity}` : o.name)).join(' · ') }}
              </p>
            </li>
          </ul>

          <NxButton
            v-if="canDispatch(card.ticket, column.status)"
            size="sm"
            class="mb-1.5 w-full"
            icon="pi pi-send"
            :loading="dispatchMutation.isPending.value"
            @click="dispatchMutation.mutate(card.ticket.id)"
          >
            {{ dispatchLabel(card.ticket) }}
          </NxButton>

          <div class="flex gap-1.5">
            <NxButton
              v-for="target in COLUMNS"
              :key="target.status"
              size="sm"
              :variant="target.status === column.status ? 'primary' : 'outline'"
              :loading="updateStatusMutation.isPending.value"
              class="flex-1"
              @click="advance(card.ticket, card.items, target.status)"
            >
              {{ target.label }}
            </NxButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
