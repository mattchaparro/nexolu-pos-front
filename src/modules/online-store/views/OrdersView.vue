<script setup lang="ts">
// Bandeja de pedidos de la tienda online.
//
// Un pedido entra sin que nadie toque el POS, asi que esta pantalla se
// refresca sola (ver useOrders) y el menu lleva un contador de nuevos.
import { computed, ref } from 'vue'

import type { Order } from '@/types/order'
import { NxColumn, NxDataTable, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import OrderDetailModal from '../components/OrderDetailModal.vue'
import { useOrders } from '../composables/useOrders'
import { ORDER_STATUS_FILTERS, statusMeta } from '../support/orderStatus'

const status = ref('')
const page = ref(1)

const ordersQuery = useOrders(status, page)
const meta = computed(() => ordersQuery.data.value?.meta)

function selectStatus(value: string): void {
  status.value = value
  page.value = 1
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const detailOpen = ref(false)
const selectedId = ref<number | null>(null)

function openOrder(order: Order): void {
  selectedId.value = order.id
  detailOpen.value = true
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Pedidos online" icon="pi pi-inbox" compact />

    <div class="flex flex-wrap gap-2">
      <button
        v-for="filter in ORDER_STATUS_FILTERS"
        :key="filter.value"
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm font-semibold transition"
        :class="
          status === filter.value
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
        "
        @click="selectStatus(filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="ordersQuery.data.value?.data ?? []"
        :loading="ordersQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">
            {{
              status
                ? 'No hay pedidos en este estado.'
                : 'Todavía no has recibido pedidos por la tienda.'
            }}
          </p>
        </template>

        <NxColumn header="Pedido">
          <template #body="{ data }: { data: Order }">
            <p class="text-sm font-semibold text-slate-900">#{{ data.number }}</p>
            <p class="text-xs text-slate-400">{{ formatDate(data.created_at) }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Cliente">
          <template #body="{ data }: { data: Order }">
            <p class="text-sm text-slate-700">{{ data.customer_name }}</p>
            <p class="text-xs text-slate-400">{{ data.customer_phone }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Entrega">
          <template #body="{ data }: { data: Order }">
            <span class="text-sm text-slate-600">
              {{ data.is_pickup ? 'Recoge en tienda' : (data.shipping_city ?? 'Domicilio') }}
            </span>
          </template>
        </NxColumn>

        <NxColumn header="Total">
          <template #body="{ data }: { data: Order }">
            <span class="text-sm font-semibold text-slate-900">{{ formatCop(data.total) }}</span>
          </template>
        </NxColumn>

        <NxColumn header="Estado">
          <template #body="{ data }: { data: Order }">
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="statusMeta(data.status).classes"
            >
              {{ statusMeta(data.status).label }}
            </span>
          </template>
        </NxColumn>

        <NxColumn>
          <template #body="{ data }: { data: Order }">
            <div class="flex justify-end">
              <button
                type="button"
                class="text-slate-400 hover:text-indigo-600"
                title="Ver pedido"
                @click="openOrder(data)"
              >
                <i class="pi pi-eye text-sm" />
              </button>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <OrderDetailModal v-model="detailOpen" :order-id="selectedId" />
  </div>
</template>
