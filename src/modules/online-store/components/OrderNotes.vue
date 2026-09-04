<script setup lang="ts">
// Notas del pedido: las del equipo y los mensajes al comprador.
//
// Las dos en un solo hilo porque son lo mismo -- algo que alguien escribió
// sobre este pedido -- y separarlas obligaría a leer dos listas intercaladas
// para reconstruir qué pasó. Lo que cambia es a quién le llega.
//
// Un mensaje al comprador SALE de verdad, así que aquí se muestra el
// resultado real de cada canal: WhatsApp con texto libre solo se entrega
// dentro de la ventana de 24 horas de Meta, y un mensaje que no llegó no
// puede verse igual que uno que sí.
import { computed, ref } from 'vue'

import type { Order, OrderContactChannel, OrderNote } from '@/types/order'
import { NxButton, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useOrderMutations } from '../composables/useOrders'
import { whatsappLink } from '../support/orderStatus'

const props = defineProps<{ order: Order }>()

const { noteMutation } = useOrderMutations()

const CHANNEL_LABEL: Record<OrderContactChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Correo',
}

const notes = computed(() => props.order.notes ?? [])
const available = computed<OrderContactChannel[]>(() => props.order.contact_channels ?? [])

const body = ref('')
const forCustomer = ref(false)
// Se arranca con todos los medios que el comprador dejó: si escribió su
// correo y su teléfono, lo normal es querer llegarle por los dos.
const channels = ref<OrderContactChannel[]>([])
const errorMessage = ref<string | null>(null)

function toggleCustomer(value: boolean): void {
  forCustomer.value = value
  channels.value = value ? [...available.value] : []
  errorMessage.value = null
}

function toggleChannel(channel: OrderContactChannel): void {
  channels.value = channels.value.includes(channel)
    ? channels.value.filter((item) => item !== channel)
    : [...channels.value, channel]
}

const canSubmit = computed(
  () =>
    body.value.trim().length > 0 &&
    (!forCustomer.value || channels.value.length > 0) &&
    !noteMutation.isPending.value,
)

async function submit(): Promise<void> {
  if (!canSubmit.value) return

  errorMessage.value = null
  try {
    await noteMutation.mutateAsync({
      id: props.order.id,
      body: body.value.trim(),
      visibility: forCustomer.value ? 'customer' : 'internal',
      channels: forCustomer.value ? channels.value : [],
    })
    body.value = ''
    toggleCustomer(false)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos guardar la nota.')
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Canales de una nota que no llegaron, con el motivo que dio el proveedor. */
function failures(note: OrderNote): { channel: OrderContactChannel; error: string | null }[] {
  return note.channels
    .filter((channel) => note.delivery[channel]?.status !== 'sent')
    .map((channel) => ({ channel, error: note.delivery[channel]?.error ?? null }))
}

function delivered(note: OrderNote): OrderContactChannel[] {
  return note.channels.filter((channel) => note.delivery[channel]?.status === 'sent')
}

/** Salida a mano cuando el envío automático no llegó. */
const manualWhatsapp = computed(() =>
  whatsappLink(
    props.order.customer_phone,
    body.value.trim() ||
      `Hola ${props.order.customer_name}, te escribimos por tu pedido #${props.order.number}.`,
  ),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <ul v-if="notes.length > 0" class="flex flex-col gap-2">
      <li
        v-for="note in notes"
        :key="note.id"
        class="rounded-xl border p-3"
        :class="
          note.visibility === 'customer'
            ? 'border-indigo-100 bg-indigo-50/50'
            : 'border-slate-200 bg-white'
        "
      >
        <div class="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span
            class="rounded-full px-2 py-0.5 font-semibold"
            :class="
              note.visibility === 'customer'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-500'
            "
          >
            {{ note.visibility === 'customer' ? 'Al comprador' : 'Interna' }}
          </span>
          <span class="text-slate-400">{{ formatDateTime(note.at) }}</span>
          <span v-if="note.user" class="text-slate-400">· {{ note.user }}</span>
        </div>

        <p class="whitespace-pre-line text-sm text-slate-700">{{ note.body }}</p>

        <!-- Qué llegó y qué no. Sin esto, "le escribí" y "creí que le
             escribí" se ven idénticos. -->
        <div v-if="note.visibility === 'customer'" class="mt-2 flex flex-col gap-1">
          <p v-if="delivered(note).length > 0" class="text-[11px] font-semibold text-emerald-700">
            <i class="pi pi-check-circle mr-1" />
            Entregado por
            {{
              delivered(note)
                .map((c) => CHANNEL_LABEL[c])
                .join(' y ')
            }}
          </p>
          <p
            v-for="failure in failures(note)"
            :key="failure.channel"
            class="text-[11px] text-amber-700"
          >
            <i class="pi pi-exclamation-triangle mr-1" />
            No salió por {{ CHANNEL_LABEL[failure.channel]
            }}<template v-if="failure.error"> — {{ failure.error }}</template>
          </p>
        </div>
      </li>
    </ul>

    <p v-else class="text-sm text-slate-400">
      Todavía no hay notas. Sirven para dejarle contexto al equipo, o para escribirle al comprador
      sin salir de aquí.
    </p>

    <!-- Escribir -->
    <div class="rounded-xl border border-slate-200 p-3">
      <NxTextarea v-model="body" :rows="3" placeholder="Escribe una nota sobre este pedido…" />

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
          :class="
            !forCustomer
              ? 'border-slate-800 bg-slate-800 text-white'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          "
          @click="toggleCustomer(false)"
        >
          Solo para el equipo
        </button>
        <button
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            forCustomer
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          "
          :disabled="available.length === 0"
          @click="toggleCustomer(true)"
        >
          Enviársela al comprador
        </button>
      </div>

      <p v-if="available.length === 0" class="mt-2 text-xs text-slate-400">
        Este comprador no dejó teléfono ni correo válidos, así que no hay por dónde escribirle.
      </p>

      <div v-if="forCustomer" class="mt-3">
        <p class="mb-1.5 text-xs font-semibold text-slate-500">¿Por dónde se la mandamos?</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="channel in available"
            :key="channel"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
            :class="
              channels.includes(channel)
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            "
            @click="toggleChannel(channel)"
          >
            <i
              :class="[
                channels.includes(channel) ? 'pi pi-check-square' : 'pi pi-stop',
                'text-[11px]',
              ]"
            />
            {{ CHANNEL_LABEL[channel] }}
          </button>
        </div>

        <!-- Meta no entrega texto libre fuera de la ventana de 24 horas desde
             el último mensaje del comprador, y lo normal es que un comprador
             nunca le haya escrito a la tienda. Decirlo antes evita que el
             comerciante dé por avisado a alguien que no se enteró. -->
        <p v-if="channels.includes('whatsapp')" class="mt-2 text-[11px] text-slate-400">
          WhatsApp solo entrega texto libre si el comprador te escribió en las últimas 24 horas. Si
          no, te avisamos aquí y puedes
          <a
            :href="manualWhatsapp"
            target="_blank"
            rel="noopener"
            class="font-semibold text-emerald-600 hover:underline"
            >mandárselo tú mismo</a
          >.
        </p>
      </div>

      <p v-if="errorMessage" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <div class="mt-3">
        <NxButton :disabled="!canSubmit" :loading="noteMutation.isPending.value" @click="submit">
          {{ forCustomer ? 'Enviar al comprador' : 'Guardar nota' }}
        </NxButton>
      </div>
    </div>
  </div>
</template>
