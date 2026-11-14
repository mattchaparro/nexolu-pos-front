<script setup lang="ts">
// Domicilios: la pantalla del domiciliario (un empleado con el permiso
// "Hacer domicilios"), pensada para el celular. Ve lo que está listo para
// salir, lo toma ("Lo llevo") y lo marca entregado. El dueño ve lo mismo y
// además quién lleva qué. Se refresca sola: no hay websockets.
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { fetchDeliveries, markDelivered, takeDelivery, type Delivery } from '../services/deliveryService'
import { cashToCollect, deliveryTitle, paymentText as deliveryPaymentText, mapsUrl } from '../support/deliveryText'

const POLL_INTERVAL_MS = 5000

const auth = useAuthStore()
const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const queryClient = useQueryClient()

const deliveriesQuery = useQuery({
  queryKey: ['deliveries'],
  queryFn: fetchDeliveries,
  refetchInterval: POLL_INTERVAL_MS,
})

const all = computed(() => deliveriesQuery.data.value ?? [])
const ready = computed(() => all.value.filter((d) => d.status === 'pending' && d.is_ready))
const inKitchen = computed(() => all.value.filter((d) => d.status === 'pending' && !d.is_ready))
const onTheWay = computed(() => all.value.filter((d) => d.status === 'on_the_way'))
const deliveredToday = computed(() => all.value.filter((d) => d.status === 'delivered'))

const myId = computed(() => auth.user?.id ?? null)
const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)

// Lo que trae el domiciliario en efectivo de lo que entregó hoy.
const myCashToday = computed(() =>
  deliveredToday.value
    .filter((d) => d.courier?.id === myId.value && cashToCollect(d) > 0)
    .reduce((sum, d) => sum + cashToCollect(d), 0),
)

function methodLabel(id: string | null): string {
  return business.value?.payment_methods?.find((m) => m.id === id)?.label ?? id ?? ''
}

function paymentText(delivery: Delivery): string {
  return deliveryPaymentText(delivery, methodLabel)
}

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}`
}

const title = deliveryTitle

const refresh = () => queryClient.invalidateQueries({ queryKey: ['deliveries'] })

const takeMutation = useMutation({
  mutationFn: (id: number) => takeDelivery(id),
  onSuccess: () => notify('Va en camino'),
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos tomar el domicilio.'), 'error'),
  onSettled: refresh,
})

const deliverMutation = useMutation({
  mutationFn: (id: number) => markDelivered(id),
  onSuccess: () => notify('Entregado'),
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos marcarlo como entregado.'), 'error'),
  onSettled: refresh,
})

function canDeliver(delivery: Delivery): boolean {
  return delivery.courier?.id === myId.value || isAdmin.value
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-5 pb-24 lg:pb-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-truck text-lg text-indigo-600" />
        <h1 class="text-lg font-bold text-slate-900">Domicilios</h1>
      </div>
      <p v-if="myCashToday > 0" class="text-right text-xs text-slate-500">
        Efectivo que traes hoy<br />
        <span class="text-sm font-bold text-slate-900">{{ formatCop(myCashToday) }}</span>
      </p>
    </div>

    <div v-if="deliveriesQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else>
      <!-- Por llevar -->
      <section class="flex flex-col gap-3">
        <h2 class="flex items-center justify-between text-sm font-semibold text-slate-700">
          Listos para llevar
          <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{{ ready.length }}</span>
        </h2>
        <p v-if="ready.length === 0" class="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
          No hay domicilios esperando.
        </p>
        <article v-for="delivery in ready" :key="delivery.id" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-slate-900">{{ title(delivery) }}</p>
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
            <span class="underline-offset-2 hover:underline">{{ delivery.address }}</span>
          </a>
          <p v-else class="mt-2 flex items-center gap-2 text-sm text-amber-700">
            <i class="pi pi-exclamation-triangle" /> Sin dirección: llama al cliente
          </p>
          <p v-if="delivery.notes" class="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <i class="pi pi-comment mt-0.5" />
            <span>{{ delivery.notes }}</span>
          </p>
          <p class="mt-2 text-sm text-slate-600">
            {{ delivery.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ') }}
          </p>
          <p
            class="mt-2 text-sm font-semibold"
            :class="cashToCollect(delivery) > 0 ? 'text-slate-900' : 'text-emerald-700'"
          >
            {{ paymentText(delivery) }}
          </p>
          <NxButton
            class="mt-3 w-full"
            size="lg"
            icon="pi pi-truck"
            :loading="takeMutation.isPending.value && takeMutation.variables.value === delivery.id"
            @click="takeMutation.mutate(delivery.id)"
          >
            Lo llevo
          </NxButton>
        </article>
      </section>

      <!-- En camino -->
      <section v-if="onTheWay.length > 0" class="flex flex-col gap-3">
        <h2 class="flex items-center justify-between text-sm font-semibold text-slate-700">
          En camino
          <span class="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{{ onTheWay.length }}</span>
        </h2>
        <article
          v-for="delivery in onTheWay"
          :key="delivery.id"
          class="rounded-xl border bg-white p-4 shadow-sm"
          :class="delivery.courier?.id === myId ? 'border-indigo-300' : 'border-slate-200'"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-slate-900">{{ title(delivery) }}</p>
            <span class="shrink-0 text-xs text-slate-500">
              {{ delivery.courier?.id === myId ? 'Lo llevas tú' : delivery.courier?.name }} · {{ delivery.taken_at }}
            </span>
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
          <p v-if="delivery.notes" class="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <i class="pi pi-comment mt-0.5" />
            <span>{{ delivery.notes }}</span>
          </p>
          <p class="mt-2 text-sm font-semibold" :class="cashToCollect(delivery) > 0 ? 'text-slate-900' : 'text-emerald-700'">
            {{ paymentText(delivery) }}
          </p>
          <div v-if="delivery.customer_phone" class="mt-3 grid grid-cols-2 gap-2">
            <a
              :href="`tel:${delivery.customer_phone}`"
              class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <i class="pi pi-phone" /> Llamar
            </a>
            <a
              :href="whatsappUrl(delivery.customer_phone)"
              target="_blank"
              rel="noopener"
              class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <i class="pi pi-whatsapp" /> WhatsApp
            </a>
          </div>
          <NxButton
            v-if="canDeliver(delivery)"
            class="mt-3 w-full"
            size="lg"
            icon="pi pi-check"
            :loading="deliverMutation.isPending.value && deliverMutation.variables.value === delivery.id"
            @click="deliverMutation.mutate(delivery.id)"
          >
            Entregado
          </NxButton>
        </article>
      </section>

      <!-- En cocina: todavía no se pueden tomar, pero se ve qué viene. -->
      <section v-if="inKitchen.length > 0" class="flex flex-col gap-2">
        <h2 class="text-sm font-semibold text-slate-500">En cocina ({{ inKitchen.length }})</h2>
        <div
          v-for="delivery in inKitchen"
          :key="delivery.id"
          class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
        >
          <span class="truncate">{{ title(delivery) }} · {{ delivery.address || 'Sin dirección' }}</span>
          <span class="shrink-0 text-xs">{{ delivery.created_at }}</span>
        </div>
      </section>

      <!-- Entregados hoy -->
      <section v-if="deliveredToday.length > 0" class="flex flex-col gap-2">
        <h2 class="text-sm font-semibold text-slate-500">Entregados hoy ({{ deliveredToday.length }})</h2>
        <div
          v-for="delivery in deliveredToday"
          :key="delivery.id"
          class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        >
          <span class="truncate">
            <i class="pi pi-check mr-1 text-emerald-600" />{{ title(delivery) }}
          </span>
          <span class="shrink-0 text-xs text-slate-400">{{ delivery.courier?.name }} · {{ delivery.delivered_at }}</span>
        </div>
      </section>
    </template>
  </div>
</template>
