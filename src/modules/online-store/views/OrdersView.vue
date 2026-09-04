<script setup lang="ts">
// Bandeja de pedidos de la tienda online.
//
// Un pedido entra sin que nadie toque el POS, asi que esta pantalla se
// refresca sola (ver useOrders) y el menu lleva un contador de nuevos.
import { computed, ref, watch } from 'vue'

import type { Order } from '@/types/order'
import { NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useOrders } from '../composables/useOrders'
import { ORDER_STATUS_FILTERS, statusMeta, whatsappLink } from '../support/orderStatus'

const status = ref('')
const page = ref(1)

/**
 * Buscar por lo que el comerciante tiene a mano cuando alguien le reclama:
 * el número que le dijeron, o el nombre/teléfono del que llamó. Con espera,
 * para no pedir una página por cada tecla.
 */
const searchInput = ref('')
const search = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value
    page.value = 1
  }, 350)
})

const ordersQuery = useOrders(status, page, search)
const meta = computed(() => ordersQuery.data.value?.meta)

/**
 * Aviso de pedido nuevo con la pantalla abierta.
 *
 * La bandeja se refresca sola cada minuto, pero el pedido aparecía en
 * silencio: quien está mirando la pantalla no se entera de que entró uno.
 * Se compara contra el mayor número visto, no contra el total, porque el
 * total también cambia al filtrar o paginar.
 */
const highestSeen = ref<number | null>(null)
const newOrders = ref(0)

watch(
  () => ordersQuery.data.value?.data,
  (orders) => {
    if (!orders || orders.length === 0) return

    const highest = Math.max(...orders.map((order) => order.number))
    if (highestSeen.value === null) {
      highestSeen.value = highest
      return
    }

    if (highest > highestSeen.value) {
      newOrders.value += orders.filter((order) => order.number > highestSeen.value!).length
      highestSeen.value = highest
    }
  },
)

function dismissNewOrders(): void {
  newOrders.value = 0
}

function selectStatus(value: string): void {
  status.value = value
  page.value = 1
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
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

/**
 * Un pedido pendiente cuya reserva ya venció: soltó el stock y no va a
 * cobrarse solo. Se veía igual que uno vivo, y son cosas muy distintas a la
 * hora de decidir si despachar.
 */
function isExpired(order: Order): boolean {
  return (
    order.status === 'pending' &&
    order.expires_at !== null &&
    new Date(order.expires_at) < new Date()
  )
}

/** Escribirle al comprador: es lo primero que uno hace si falta la dirección. */
function whatsappFor(order: Order): string {
  return whatsappLink(
    order.customer_phone,
    `Hola ${order.customer_name}, te escribo por tu pedido #${order.number}.`,
  )
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Pedidos online" icon="pi pi-inbox" compact />

    <!-- Entró un pedido con la pantalla abierta. Antes aparecía en silencio
         en el refresco de cada minuto. -->
    <button
      v-if="newOrders > 0"
      type="button"
      class="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-800"
      @click="dismissNewOrders"
    >
      <i class="pi pi-bell" />
      {{ newOrders === 1 ? 'Entró un pedido nuevo' : `Entraron ${newOrders} pedidos nuevos` }}
      <span class="text-xs font-normal text-emerald-600">Toca para descartar</span>
    </button>

    <NxInput
      v-model="searchInput"
      placeholder="Buscar por nombre, teléfono o número de pedido"
      icon="pi pi-search"
    />

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
            <RouterLink
              :to="{ name: 'online-store.order', params: { id: data.id } }"
              class="text-sm font-semibold text-indigo-600 hover:underline"
            >
              #{{ data.number }}
            </RouterLink>
            <p class="text-xs text-slate-400">{{ formatDate(data.created_at) }}</p>
            <span
              v-if="isExpired(data)"
              class="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
            >
              Reserva vencida
            </span>
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
            <!-- Sin esto el total no cuadra contra subtotal + envío y no hay
                 nada que explique la diferencia. -->
            <p v-if="data.discount_amount > 0" class="text-[11px] text-emerald-600">
              −{{ formatCop(data.discount_amount) }}
              <template v-if="data.coupon_code"> · {{ data.coupon_code }}</template>
            </p>
          </template>
        </NxColumn>

        <!-- "¿Este ya me pagó?" es la primera pregunta al despachar, y no
             había forma de responderla: un pedido pagado por Bold y uno
             confirmado a mano se veían idénticos. -->
        <NxColumn header="Pago">
          <template #body="{ data }: { data: Order }">
            <template v-if="data.paid_at">
              <span
                class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
              >
                Pagado
              </span>
              <p class="mt-0.5 text-[11px] text-slate-400">
                <template v-if="data.payment_provider">{{ data.payment_provider }} · </template>
                {{ formatDate(data.paid_at) }}
              </p>
            </template>
            <span v-else class="text-xs text-slate-400">Sin pagar</span>
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
            <div class="flex justify-end gap-3">
              <a
                :href="whatsappFor(data)"
                target="_blank"
                rel="noopener"
                class="text-slate-400 hover:text-emerald-600"
                title="Escribirle al comprador"
              >
                <i class="pi pi-whatsapp text-sm" />
              </a>
              <RouterLink
                :to="{ name: 'online-store.order', params: { id: data.id } }"
                class="text-slate-400 hover:text-indigo-600"
                title="Ver pedido"
              >
                <i class="pi pi-eye text-sm" />
              </RouterLink>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
