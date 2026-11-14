<script setup lang="ts">
// Despacho: la pantalla de la caja cuando la cocina trabaja con papel
// (comandera física). Nadie en la cocina toca una pantalla, así que es aquí
// donde se mueve lo que sale: «Salió a domicilio» imprime la factura y el
// ticket del domiciliario, «Entregado» cierra el domicilio cuando vuelve, y
// «El cliente lo recogió» entrega un pedido para recoger. Se refresca sola.
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, reactive } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Delivery } from '@/modules/deliveries/services/deliveryService'
import {
  cashToCollect,
  deliveryTitle,
  mapsUrl,
  paymentText,
} from '@/modules/deliveries/support/deliveryText'
import PrintingStatusBanner from '@/modules/printing/components/PrintingStatusBanner.vue'
import { reprintSaleReceipt } from '@/modules/printing/services/printingService'
import { NxButton, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import {
  fetchDispatchBoard,
  markDispatchDelivered,
  markPickedUp,
  reprintKitchenTicket,
  sendOutDelivery,
} from '../services/dispatchService'

const POLL_INTERVAL_MS = 3000

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const queryClient = useQueryClient()

const boardQuery = useQuery({
  queryKey: ['dispatch'],
  queryFn: fetchDispatchBoard,
  refetchInterval: POLL_INTERVAL_MS,
})

const board = computed(() => boardQuery.data.value)
const toSend = computed(() => (board.value?.deliveries ?? []).filter((d) => d.status === 'pending'))
const onTheWay = computed(() =>
  (board.value?.deliveries ?? []).filter((d) => d.status === 'on_the_way'),
)
const deliveredToday = computed(() =>
  (board.value?.deliveries ?? []).filter((d) => d.status === 'delivered'),
)
const pickups = computed(() => board.value?.pickups ?? [])
const courierOptions = computed(() => [
  { label: 'Sin asignar', value: null },
  ...(board.value?.couriers ?? []).map((courier) => ({ label: courier.name, value: courier.id })),
])

// Domiciliario elegido por domicilio antes de despacharlo.
const chosenCourier = reactive<Record<number, number | null>>({})

function methodLabel(id: string | null): string {
  return business.value?.payment_methods?.find((m) => m.id === id)?.label ?? id ?? ''
}

function itemsText(delivery: Delivery): string {
  return delivery.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')
}

const refresh = () => queryClient.invalidateQueries({ queryKey: ['dispatch'] })

const sendOutMutation = useMutation({
  mutationFn: (saleId: number) => sendOutDelivery(saleId, chosenCourier[saleId] ?? null),
  onSuccess: () =>
    notify('Salió. La factura y el ticket del domicilio se están imprimiendo.', 'success'),
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos despacharlo.'), 'error'),
  onSettled: refresh,
})

const deliveredMutation = useMutation({
  mutationFn: (saleId: number) => markDispatchDelivered(saleId),
  onSuccess: () => notify('Entregado.', 'success'),
  onError: (error) =>
    notify(extractErrorMessage(error, 'No pudimos marcarlo como entregado.'), 'error'),
  onSettled: refresh,
})

const pickedUpMutation = useMutation({
  mutationFn: (saleId: number) => markPickedUp(saleId),
  onSuccess: () => notify('Entregado al cliente.', 'success'),
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos entregarlo.'), 'error'),
  onSettled: refresh,
})

const kitchenReprintMutation = useMutation({
  mutationFn: (saleId: number) => reprintKitchenTicket(saleId),
  onSuccess: () => notify('Comanda reimpresa en la cocina.', 'success'),
  onError: (error) =>
    notify(extractErrorMessage(error, 'No pudimos reimprimir la comanda.'), 'error'),
})

const receiptReprintMutation = useMutation({
  mutationFn: (saleId: number) => reprintSaleReceipt(saleId),
  onSuccess: () => notify('Factura reimpresa en el mostrador.', 'success'),
  onError: (error) =>
    notify(extractErrorMessage(error, 'No pudimos reimprimir la factura.'), 'error'),
})

function isPending(
  mutation: { isPending: { value: boolean }; variables: { value: unknown } },
  saleId: number,
): boolean {
  return mutation.isPending.value && mutation.variables.value === saleId
}
</script>

<template>
  <div class="flex flex-col gap-5 pb-24 lg:pb-6">
    <div class="flex items-center gap-2">
      <i class="pi pi-send text-lg text-indigo-600" />
      <h1 class="text-lg font-bold text-slate-900">Despacho</h1>
    </div>

    <PrintingStatusBanner />

    <div v-if="boardQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <div v-else class="grid gap-5 lg:grid-cols-3">
      <!-- Domicilios por despachar -->
      <section class="flex min-w-0 flex-col gap-3">
        <h2 class="flex items-center justify-between text-sm font-semibold text-slate-700">
          Domicilios por despachar
          <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{{
            toSend.length
          }}</span>
        </h2>
        <p
          v-if="toSend.length === 0"
          class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400"
        >
          No hay domicilios esperando.
        </p>
        <article
          v-for="delivery in toSend"
          :key="delivery.id"
          class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-slate-900">{{ deliveryTitle(delivery) }}</p>
            <span class="shrink-0 text-xs text-slate-400">{{ delivery.created_at }}</span>
          </div>
          <a
            v-if="delivery.address"
            :href="mapsUrl(delivery.address)"
            target="_blank"
            rel="noopener"
            class="mt-2 flex items-start gap-2 text-sm text-indigo-700"
          >
            <i class="pi pi-map-marker mt-0.5" />
            <span>{{ delivery.address }}</span>
          </a>
          <p v-else class="mt-2 flex items-center gap-2 text-sm text-amber-700">
            <i class="pi pi-exclamation-triangle" /> Sin dirección
          </p>
          <p
            v-if="delivery.notes"
            class="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            <i class="pi pi-comment mt-0.5" />
            <span>{{ delivery.notes }}</span>
          </p>
          <p class="mt-2 text-sm text-slate-600">{{ itemsText(delivery) }}</p>
          <p
            class="mt-2 text-sm font-semibold"
            :class="cashToCollect(delivery) > 0 ? 'text-slate-900' : 'text-emerald-700'"
          >
            {{ paymentText(delivery, methodLabel) }}
          </p>
          <NxSelect
            v-if="courierOptions.length > 1"
            v-model="chosenCourier[delivery.id]"
            class="mt-3"
            :options="courierOptions"
            option-label="label"
            option-value="value"
            label="Lo lleva"
            size="sm"
          />
          <div class="mt-3 flex gap-2">
            <NxButton
              class="flex-1"
              icon="pi pi-truck"
              :loading="isPending(sendOutMutation, delivery.id)"
              @click="sendOutMutation.mutate(delivery.id)"
            >
              Salió a domicilio
            </NxButton>
            <NxButton
              variant="outline"
              icon="pi pi-print"
              title="Reimprimir la comanda en la cocina"
              :loading="isPending(kitchenReprintMutation, delivery.id)"
              @click="kitchenReprintMutation.mutate(delivery.id)"
            />
          </div>
        </article>
      </section>

      <!-- Para recoger -->
      <section class="flex min-w-0 flex-col gap-3">
        <h2 class="flex items-center justify-between text-sm font-semibold text-slate-700">
          Para recoger
          <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{{
            pickups.length
          }}</span>
        </h2>
        <p
          v-if="pickups.length === 0"
          class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400"
        >
          Nadie viene a recoger por ahora.
        </p>
        <article
          v-for="pickup in pickups"
          :key="pickup.id"
          class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-slate-900">{{ deliveryTitle(pickup) }}</p>
            <span class="shrink-0 text-xs text-slate-400">{{ pickup.created_at }}</span>
          </div>
          <p
            v-if="pickup.notes"
            class="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            <i class="pi pi-comment mt-0.5" />
            <span>{{ pickup.notes }}</span>
          </p>
          <p class="mt-2 text-sm text-slate-600">{{ itemsText(pickup) }}</p>
          <p
            class="mt-2 text-sm font-semibold"
            :class="pickup.is_paid_online ? 'text-emerald-700' : 'text-slate-900'"
          >
            {{ paymentText(pickup, methodLabel) }}
          </p>
          <div class="mt-3 flex gap-2">
            <NxButton
              class="flex-1"
              icon="pi pi-check"
              :loading="isPending(pickedUpMutation, pickup.id)"
              @click="pickedUpMutation.mutate(pickup.id)"
            >
              El cliente lo recogió
            </NxButton>
            <NxButton
              variant="outline"
              icon="pi pi-print"
              title="Reimprimir la comanda en la cocina"
              :loading="isPending(kitchenReprintMutation, pickup.id)"
              @click="kitchenReprintMutation.mutate(pickup.id)"
            />
          </div>
        </article>
      </section>

      <!-- En camino y entregados -->
      <section class="flex min-w-0 flex-col gap-3">
        <h2 class="flex items-center justify-between text-sm font-semibold text-slate-700">
          En camino
          <span class="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{{
            onTheWay.length
          }}</span>
        </h2>
        <p
          v-if="onTheWay.length === 0"
          class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400"
        >
          Ningún domicilio en camino.
        </p>
        <article
          v-for="delivery in onTheWay"
          :key="delivery.id"
          class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-slate-900">{{ deliveryTitle(delivery) }}</p>
            <span class="shrink-0 text-xs text-slate-500">
              {{ delivery.courier?.name ?? 'Sin asignar' }} · {{ delivery.taken_at }}
            </span>
          </div>
          <p class="mt-1 truncate text-sm text-slate-500">{{ delivery.address }}</p>
          <p
            class="mt-2 text-sm font-semibold"
            :class="cashToCollect(delivery) > 0 ? 'text-slate-900' : 'text-emerald-700'"
          >
            {{ paymentText(delivery, methodLabel) }}
          </p>
          <div class="mt-3 flex gap-2">
            <NxButton
              class="flex-1"
              variant="secondary"
              icon="pi pi-check"
              :loading="isPending(deliveredMutation, delivery.id)"
              @click="deliveredMutation.mutate(delivery.id)"
            >
              Entregado
            </NxButton>
            <NxButton
              variant="outline"
              icon="pi pi-file"
              title="Reimprimir la factura"
              :loading="isPending(receiptReprintMutation, delivery.id)"
              @click="receiptReprintMutation.mutate(delivery.id)"
            />
          </div>
        </article>

        <template v-if="deliveredToday.length > 0">
          <h2 class="mt-2 text-sm font-semibold text-slate-500">
            Entregados hoy ({{ deliveredToday.length }})
          </h2>
          <div
            v-for="delivery in deliveredToday"
            :key="delivery.id"
            class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
          >
            <span class="truncate"
              ><i class="pi pi-check mr-1 text-emerald-600" />{{ deliveryTitle(delivery) }}</span
            >
            <span class="shrink-0 text-xs text-slate-400"
              >{{ delivery.courier?.name }} · {{ delivery.delivered_at }}</span
            >
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
