<script setup lang="ts">
// Único sitio donde se mueve un pedido de estado.
//
// Los botones salen de `available_transitions`, que manda el backend: la
// máquina de estados vive en Order::TRANSITIONS y aquí solo se dibuja.
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import type { Order, OrderStatus } from '@/types/order'
import { NxButton, NxSelect, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import { useOrderMutations } from '../composables/useOrders'
import { statusMeta } from '../support/orderStatus'

const props = defineProps<{ order: Order }>()

const { statusMutation } = useOrderMutations()

const note = ref('')
const errorMessage = ref<string | null>(null)

/**
 * Transiciones que piden confirmación antes de ejecutarse, con el motivo que
 * se le muestra al comerciante.
 *
 * Confirmación en la propia pantalla y no un window.confirm (que es lo que
 * usa el resto de la app para borrar): confirmar un pedido crea una venta y
 * descuenta inventario de verdad, y eso hay que explicarlo con más de una
 * línea de texto plano en un diálogo del navegador.
 */
const NEEDS_CONFIRMATION: Partial<Record<OrderStatus, string>> = {
  confirmed:
    'Se creará la venta en la caja y se descontará el inventario. Esto no se puede deshacer.',
  cancelled: 'El pedido se cierra y libera el stock que tenía apartado.',
}

const pendingStatus = ref<OrderStatus | null>(null)
const confirmationText = computed(() =>
  pendingStatus.value ? NEEDS_CONFIRMATION[pendingStatus.value] : null,
)

// Con qué le pagaron. Cuando el pago no entró por la pasarela se coordina por
// fuera (transferencia, Nequi, contraentrega) y solo el comerciante sabe cuál
// fue - por eso lo elige aquí y no lo fija el código. Fiado queda fuera: no
// hay mostrador donde fiarle a nadie.
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
  errorMessage.value = null
  try {
    await statusMutation.mutateAsync({
      id: props.order.id,
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
</script>

<template>
  <div v-if="order.available_transitions.length > 0" class="flex flex-col gap-2">
    <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
      {{ errorMessage }}
    </p>

    <!-- El paso de confirmación reemplaza a los botones en vez de sumarse,
         para que no queden dos acciones distintas pidiendo el mismo clic. -->
    <div v-if="pendingStatus" class="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p class="text-sm font-semibold text-slate-900">{{ statusMeta(pendingStatus).action }}</p>
      <p class="mt-0.5 text-sm text-slate-600">{{ confirmationText }}</p>

      <!-- Ya pagó por la pasarela: preguntar con qué pagó sería inventar un
           segundo medio de pago para una plata que ya entró por uno. -->
      <p
        v-if="pendingStatus === 'confirmed' && order.paid_at"
        class="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-emerald-700"
      >
        Este pedido ya se pagó por {{ order.payment_provider ?? 'la pasarela' }}.
      </p>

      <NxSelect
        v-if="pendingStatus === 'confirmed' && !order.paid_at && paymentMethods.length > 0"
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
        <NxButton
          variant="ghost"
          :disabled="statusMutation.isPending.value"
          @click="pendingStatus = null"
        >
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
</template>
