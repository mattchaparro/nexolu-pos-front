<script setup lang="ts">
// Un pedido, entero.
//
// Era una modal, y se quedaba corta: atender un pedido es leer al cliente,
// revisar qué pidió, ver si pagó, decidir a dónde lo mueves, anotar lo que
// pasó y escribirle. Eso es una pantalla, no una ventanita encima del
// listado -- y además no se podía compartir el enlace de un pedido con nadie.
import { useClipboard } from '@vueuse/core'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import type { Order } from '@/types/order'
import { NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import OrderNotes from '../components/OrderNotes.vue'
import OrderStatusActions from '../components/OrderStatusActions.vue'
import OrderSteps from '../components/OrderSteps.vue'
import { useOrder } from '../composables/useOrders'
import { statusMeta, whatsappLink } from '../support/orderStatus'

const route = useRoute()
const orderId = computed(() => (route.params.id ? Number(route.params.id) : null))
const orderQuery = useOrder(orderId)
const order = computed<Order | undefined>(() => orderQuery.data.value)

const { copy, copied } = useClipboard()

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Reserva vencida: el pedido soltó el stock y no va a cobrarse solo. Se veía
 * igual que uno vivo, y son cosas muy distintas al decidir si despachar.
 */
const isExpiredReservation = computed(
  () =>
    order.value?.status === 'pending' &&
    order.value.expires_at !== null &&
    new Date(order.value.expires_at) < new Date(),
)

/** Completa, para pasársela al domiciliario de un solo pegado. */
const fullAddress = computed(() =>
  order.value
    ? [order.value.shipping_address, order.value.shipping_city, order.value.shipping_notes]
        .filter(Boolean)
        .join(', ')
    : '',
)

const customerMessage = computed(() =>
  order.value
    ? `Hola ${order.value.customer_name}, te escribimos por tu pedido #${order.value.number}.`
    : '',
)
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <RouterLink
      :to="{ name: 'online-store.orders' }"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600"
    >
      <i class="pi pi-arrow-left text-xs" /> Pedidos online
    </RouterLink>

    <div v-if="orderQuery.isPending.value" class="py-16 text-center text-sm text-slate-400">
      Cargando…
    </div>

    <p v-else-if="!order" class="py-16 text-center text-sm text-slate-400">
      No encontramos este pedido.
    </p>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <NxPageHeader :title="`Pedido #${order.number}`" icon="pi pi-receipt" compact />
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="statusMeta(order.status).classes"
          >
            {{ statusMeta(order.status).label }}
          </span>
          <span
            v-if="isExpiredReservation"
            class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"
          >
            Reserva vencida
          </span>
          <span class="text-xs text-slate-400">{{ formatDateTime(order.created_at) }}</span>
        </div>
      </div>

      <!-- Pasos -->
      <section class="rounded-xl border border-slate-200 bg-white p-4">
        <OrderSteps :order="order" />
      </section>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="flex flex-col gap-4 lg:col-span-2">
          <!-- La compra -->
          <section class="rounded-xl border border-slate-200 bg-white">
            <h3 class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
              La compra
            </h3>
            <ul class="divide-y divide-slate-100">
              <li
                v-for="item in order.items ?? []"
                :key="item.id"
                class="flex justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span class="text-slate-700">
                  {{ item.quantity }}× {{ item.product_name }}
                  <span v-if="item.variant_label" class="text-slate-400">
                    ({{ item.variant_label }})
                  </span>
                  <span class="block text-xs text-slate-400">
                    {{ formatCop(item.unit_price) }} c/u
                  </span>
                </span>
                <span class="shrink-0 font-medium text-slate-900">
                  {{ formatCop(item.subtotal) }}
                </span>
              </li>
            </ul>
            <div class="border-t border-slate-100 px-4 py-3 text-sm">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal</span><span>{{ formatCop(order.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Envío</span>
                <span>{{ order.shipping_fee > 0 ? formatCop(order.shipping_fee) : 'Gratis' }}</span>
              </div>
              <!-- Sin esta línea el total no cuadra contra subtotal + envío y
                   no hay nada en pantalla que explique la diferencia. -->
              <div v-if="order.discount_amount > 0" class="flex justify-between text-emerald-600">
                <span>
                  Cupón<template v-if="order.coupon_code"> {{ order.coupon_code }}</template>
                </span>
                <span>−{{ formatCop(order.discount_amount) }}</span>
              </div>
              <div class="mt-1 flex justify-between text-base font-bold text-slate-900">
                <span>Total</span><span>{{ formatCop(order.total) }}</span>
              </div>
            </div>
          </section>

          <!-- Estado y acciones -->
          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <h3 class="mb-3 text-sm font-semibold text-slate-900">¿Qué sigue?</h3>
            <OrderStatusActions :order="order" />
          </section>

          <!-- Notas -->
          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <h3 class="mb-3 text-sm font-semibold text-slate-900">Notas y mensajes</h3>
            <OrderNotes :order="order" />
          </section>
        </div>

        <aside class="flex flex-col gap-4">
          <!-- Pago. "¿Este ya me pagó?" es lo primero que se pregunta al
               despachar, y sin esto un pedido pagado por la pasarela y uno
               confirmado a mano se ven idénticos. -->
          <section
            class="rounded-xl border p-4"
            :class="
              order.paid_at ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
            "
          >
            <h3
              class="text-sm font-semibold"
              :class="order.paid_at ? 'text-emerald-900' : 'text-slate-900'"
            >
              {{ order.paid_at ? 'Pagado en línea' : 'Sin pagar en línea' }}
            </h3>
            <p class="mt-1 text-xs" :class="order.paid_at ? 'text-emerald-700' : 'text-slate-500'">
              <template v-if="order.paid_at">
                <template v-if="order.payment_provider">{{ order.payment_provider }} · </template>
                {{ formatDateTime(order.paid_at) }}
              </template>
              <template v-else>
                El pago no ha entrado por la pasarela. Si le cobras por fuera, confirma el pedido y
                elige con qué te pagó.
              </template>
            </p>
            <p v-if="order.sale_id" class="mt-2 text-xs font-semibold text-slate-600">
              Venta #{{ order.sale_id }} creada
            </p>
          </section>

          <!-- Cliente -->
          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <h3 class="mb-2 text-sm font-semibold text-slate-900">Cliente</h3>
            <p class="text-sm text-slate-700">{{ order.customer_name }}</p>
            <p class="text-sm text-slate-500">{{ order.customer_phone }}</p>
            <p v-if="order.customer_email" class="break-all text-sm text-slate-500">
              {{ order.customer_email }}
            </p>
            <a
              :href="whatsappLink(order.customer_phone, customerMessage)"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
            >
              <i class="pi pi-whatsapp" /> Escribir por WhatsApp
            </a>
          </section>

          <!-- Envío -->
          <section class="rounded-xl border border-slate-200 bg-white p-4">
            <h3 class="mb-2 text-sm font-semibold text-slate-900">Entrega</h3>
            <template v-if="order.is_pickup">
              <p class="text-sm text-slate-600">
                <i class="pi pi-shop mr-1 text-xs text-slate-400" /> Recoge en la tienda
              </p>
            </template>
            <template v-else>
              <p class="text-sm text-slate-700">{{ order.shipping_address }}</p>
              <p v-if="order.shipping_city" class="text-sm text-slate-500">
                {{ order.shipping_city }}
              </p>
              <p v-if="order.shipping_notes" class="mt-1 text-sm italic text-slate-500">
                “{{ order.shipping_notes }}”
              </p>
              <!-- Para pasársela al domiciliario sin transcribirla a mano. -->
              <button
                v-if="order.shipping_address"
                type="button"
                class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600"
                @click="copy(fullAddress)"
              >
                <i class="pi pi-copy" /> {{ copied ? 'Dirección copiada' : 'Copiar dirección' }}
              </button>
            </template>
            <p
              v-if="order.expires_at && order.status === 'pending'"
              class="mt-3 text-xs text-slate-400"
            >
              Reserva {{ isExpiredReservation ? 'vencida' : 'hasta' }}
              {{ formatDateTime(order.expires_at) }}
            </p>
          </section>

          <!-- Bitácora -->
          <section
            v-if="(order.history ?? []).length > 0"
            class="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h3 class="mb-2 text-sm font-semibold text-slate-900">Historial</h3>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="(entry, index) in order.history"
                :key="index"
                class="text-xs text-slate-500"
              >
                <span class="text-slate-400">{{ formatDateTime(entry.at) }}</span> —
                {{ statusMeta(entry.to_status).label }}
                <span v-if="entry.user">por {{ entry.user }}</span>
                <span v-if="entry.note" class="italic">· {{ entry.note }}</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
