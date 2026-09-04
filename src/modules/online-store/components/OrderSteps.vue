<script setup lang="ts">
// Por donde va el pedido, de un vistazo.
//
// El listado dice el estado actual; esto dice el CAMINO: que ya pasó, qué
// sigue y cuándo ocurrió cada cosa. Es la diferencia entre "está enviado" y
// "lo confirmaste a las 9, lo despachaste a las 11".
import { computed } from 'vue'

import type { Order, OrderStatus } from '@/types/order'

import { statusMeta } from '../support/orderStatus'

const props = defineProps<{ order: Order }>()

/** El camino normal. Cancelado y vencido no son pasos: son finales. */
const FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered']

const isClosedEarly = computed(
  () => props.order.status === 'cancelled' || props.order.status === 'expired',
)

/**
 * Cuándo pasó cada estado, sacado de la bitácora. `pending` no está en la
 * bitácora (nace ahí), así que su hora es la de creación.
 */
const reachedAt = computed<Partial<Record<OrderStatus, string>>>(() => {
  const map: Partial<Record<OrderStatus, string>> = { pending: props.order.created_at ?? undefined }

  for (const entry of props.order.history ?? []) {
    if (entry.at) map[entry.to_status] = entry.at
  }

  return map
})

const currentIndex = computed(() => FLOW.indexOf(props.order.status))

function stateOf(step: OrderStatus): 'done' | 'current' | 'pending' {
  const index = FLOW.indexOf(step)
  if (index < currentIndex.value) return 'done'
  if (index === currentIndex.value) return 'current'
  return 'pending'
}

function formatTime(value: string | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <!-- Un pedido cancelado o vencido no recorrió el camino: dibujar la barra
       con pasos "pendientes" sugeriría que todavía puede avanzar. -->
  <div
    v-if="isClosedEarly"
    class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
  >
    <span class="font-semibold">{{ statusMeta(order.status).label }}</span>
    <span v-if="order.status === 'expired'">
      · la reserva venció sin confirmarse y el stock volvió al inventario.</span
    >
    <span v-else> · este pedido ya no avanza.</span>
  </div>

  <ol v-else class="flex flex-wrap gap-x-2 gap-y-3">
    <li v-for="(step, index) in FLOW" :key="step" class="flex min-w-[7.5rem] flex-1 flex-col gap-1">
      <div class="flex items-center gap-1.5">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          :class="{
            'bg-emerald-500 text-white': stateOf(step) === 'done',
            'bg-indigo-600 text-white ring-4 ring-indigo-100': stateOf(step) === 'current',
            'bg-slate-100 text-slate-400': stateOf(step) === 'pending',
          }"
        >
          <i v-if="stateOf(step) === 'done'" class="pi pi-check text-[10px]" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span
          v-if="index < FLOW.length - 1"
          class="h-0.5 flex-1 rounded"
          :class="stateOf(step) === 'done' ? 'bg-emerald-300' : 'bg-slate-100'"
        />
      </div>
      <div>
        <p
          class="text-xs font-semibold"
          :class="stateOf(step) === 'pending' ? 'text-slate-400' : 'text-slate-800'"
        >
          {{ statusMeta(step).label }}
        </p>
        <p class="text-[11px] text-slate-400">{{ formatTime(reachedAt[step]) || '—' }}</p>
      </div>
    </li>
  </ol>
</template>
