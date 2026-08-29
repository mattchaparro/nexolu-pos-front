<script setup lang="ts">
// Detalle del pedido y unico sitio donde se cambia su estado.
//
// Los botones salen de `available_transitions`, que manda el backend: la
// maquina de estados vive en Order::TRANSITIONS y aqui solo se dibuja.
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import type { Order, OrderStatus } from '@/types/order'
import { NxButton, NxModal, NxSelect, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import { useOrder, useOrderMutations } from '../composables/useOrders'
import { statusMeta, whatsappLink } from '../support/orderStatus'

const props = defineProps<{ orderId: number | null }>()
const open = defineModel<boolean>({ required: true })

const orderId = computed(() => (open.value ? props.orderId : null))
const orderQuery = useOrder(orderId)
const order = computed<Order | undefined>(() => orderQuery.data.value)

const { statusMutation } = useOrderMutations()
const note = ref('')
const errorMessage = ref<string | null>(null)

watch(open, (isOpen) => {
  if (isOpen) {
    note.value = ''
    errorMessage.value = null
    pendingStatus.value = null
  }
})

/**
 * Transiciones que piden confirmacion antes de ejecutarse, con el motivo
 * que se le muestra al comerciante.
 *
 * Confirmacion en la propia modal y no un window.confirm (que es lo que usa
 * el resto de la app para borrar): confirmar un pedido crea una venta y
 * descuenta inventario de verdad, y eso hay que explicarlo con mas de una
 * linea de texto plano en un dialogo del navegador.
 */
const NEEDS_CONFIRMATION: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Se creará la venta en la caja y se descontará el inventario. Esto no se puede deshacer.',
  cancelled: 'El pedido se cierra y libera el stock que tenía apartado.',
}

const pendingStatus = ref<OrderStatus | null>(null)
const confirmationText = computed(() => (pendingStatus.value ? NEEDS_CONFIRMATION[pendingStatus.value] : null))

// Con que le pagaron. Mientras la tienda no cobre en linea, el pago se
// coordina por fuera (transferencia, Nequi, contraentrega) y solo el
// comerciante sabe cual fue - por eso lo elige aca y no lo fija el codigo.
// Fiado queda fuera: no hay mostrador donde fiarle a nadie.
const { data: business } = useBusiness()
const paymentMethods = computed(() =>
  (business.value?.payment_methods ?? []).filter((method) => !isCreditPaymentMethodId(method.id)),
)
const paymentMethod = ref<string | null>(null)

function requestMove(status: OrderStatus): void {
  errorMessage.value = null
  if (NEEDS_CONFIRMATION[status]) {
    paymentMethod.value = paymentMethods.value[0]?.id ?? null
    pendingStatus.value = status
    return
  }
  void moveTo(status)
}

async function moveTo(status: OrderStatus): Promise<void> {
  if (!order.value) {
    return
  }

  errorMessage.value = null
  try {
    await statusMutation.mutateAsync({
      id: order.value.id,
      status,
      note: note.value.trim() || undefined,
      paymentMethod: status === 'confirmed' ? (paymentMethod.value ?? undefined) : undefined,
    })
    note.value = ''
    pendingStatus.value = null
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos cambiar el estado del pedido.')
  }
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

const customerMessage = computed(() =>
  order.value ? `Hola ${order.value.customer_name}, te escribimos por tu pedido #${order.value.number}.` : '',
)
</script>

<template>
  <NxModal v-model="open" :title="order ? `Pedido #${order.number}` : 'Pedido'" size="lg">
    <div v-if="orderQuery.isPending.value" class="py-10 text-center text-sm text-slate-400">Cargando…</div>

    <div v-else-if="order" class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusMeta(order.status).classes">
          {{ statusMeta(order.status).label }}
        </span>
        <span class="text-xs text-slate-400">{{ formatDate(order.created_at) }}</span>
        <!-- Sin enlace: no hay pantalla de detalle de venta por id, el
             historial de ventas es un listado. Se muestra el numero para
             poder buscarla ahi. -->
        <span v-if="order.sale_id" class="text-xs font-semibold text-emerald-600">
          Venta #{{ order.sale_id }} creada
        </span>
      </div>

      <!-- Comprador -->
      <div class="rounded-xl border border-slate-200 p-3">
        <p class="text-sm font-semibold text-slate-900">{{ order.customer_name }}</p>
        <p class="text-sm text-slate-500">{{ order.customer_phone }}</p>
        <p v-if="order.customer_email" class="text-sm text-slate-500">{{ order.customer_email }}</p>
        <p class="mt-2 text-sm text-slate-600">
          <i class="pi pi-map-marker mr-1 text-xs text-slate-400" />
          <template v-if="order.is_pickup">Recoge en la tienda</template>
          <template v-else>
            {{ order.shipping_address }}<template v-if="order.shipping_city">, {{ order.shipping_city }}</template>
          </template>
        </p>
        <p v-if="order.shipping_notes" class="mt-1 text-sm italic text-slate-500">“{{ order.shipping_notes }}”</p>
        <a
          :href="whatsappLink(order.customer_phone, customerMessage)"
          target="_blank"
          rel="noopener"
          class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
        >
          <i class="pi pi-whatsapp" /> Escribir por WhatsApp
        </a>
      </div>

      <!-- Articulos: nombres y precios congelados al hacer el pedido -->
      <div class="rounded-xl border border-slate-200">
        <ul class="divide-y divide-slate-100">
          <li v-for="item in order.items ?? []" :key="item.id" class="flex justify-between gap-3 px-3 py-2 text-sm">
            <span class="text-slate-700">
              {{ item.quantity }}× {{ item.product_name }}
              <span v-if="item.variant_label" class="text-slate-400">({{ item.variant_label }})</span>
            </span>
            <span class="shrink-0 text-slate-900">{{ formatCop(item.subtotal) }}</span>
          </li>
        </ul>
        <div class="border-t border-slate-100 px-3 py-2 text-sm">
          <div class="flex justify-between text-slate-500">
            <span>Subtotal</span><span>{{ formatCop(order.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-slate-500">
            <span>Envío</span><span>{{ order.shipping_fee > 0 ? formatCop(order.shipping_fee) : 'Gratis' }}</span>
          </div>
          <div class="mt-1 flex justify-between text-base font-bold text-slate-900">
            <span>Total</span><span>{{ formatCop(order.total) }}</span>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div v-if="order.available_transitions.length > 0" class="flex flex-col gap-2">
        <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ errorMessage }}</p>

        <!-- Paso de confirmacion: reemplaza a los botones en vez de sumarse,
             para que no queden dos acciones distintas pidiendo el mismo clic. -->
        <div v-if="pendingStatus" class="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p class="text-sm font-semibold text-slate-900">{{ statusMeta(pendingStatus).action }}</p>
          <p class="mt-0.5 text-sm text-slate-600">{{ confirmationText }}</p>

          <NxSelect
            v-if="pendingStatus === 'confirmed' && paymentMethods.length > 0"
            v-model="paymentMethod"
            class="mt-3"
            :options="paymentMethods"
            option-label="label"
            option-value="id"
            label="¿Con qué te pagaron?"
          />

          <div class="mt-3 flex flex-wrap gap-2">
            <NxButton
              :variant="pendingStatus === 'cancelled' ? 'danger' : 'primary'"
              :loading="statusMutation.isPending.value"
              @click="moveTo(pendingStatus)"
            >
              Sí, continuar
            </NxButton>
            <NxButton variant="ghost" :disabled="statusMutation.isPending.value" @click="pendingStatus = null">
              Volver
            </NxButton>
          </div>
        </div>

        <template v-else>
          <NxTextarea v-model="note" label="Nota interna (opcional)" :rows="2" />
          <div class="flex flex-wrap gap-2">
            <NxButton
              v-for="next in order.available_transitions"
              :key="next"
              :variant="next === 'cancelled' ? 'danger' : next === 'confirmed' ? 'primary' : 'outline'"
              :disabled="statusMutation.isPending.value"
              @click="requestMove(next)"
            >
              {{ statusMeta(next).action }}
            </NxButton>
          </div>
        </template>
      </div>
      <p v-else class="text-sm text-slate-400">Este pedido ya está cerrado.</p>

      <!-- Bitacora -->
      <div v-if="(order.history ?? []).length > 0">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Historial</p>
        <ul class="flex flex-col gap-1">
          <li v-for="(entry, index) in order.history" :key="index" class="text-xs text-slate-500">
            {{ formatDate(entry.at) }} — {{ statusMeta(entry.to_status).label }}
            <span v-if="entry.user">por {{ entry.user }}</span>
            <span v-if="entry.note" class="italic">· {{ entry.note }}</span>
          </li>
        </ul>
      </div>
    </div>
  </NxModal>
</template>
