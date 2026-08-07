<script setup lang="ts">
// Calcado del modal "Ver todos los items" del legacy (SalesTerminal.vue,
// boton open_in_full): el panel fijo de escritorio es angosto a proposito
// (la grilla de productos manda el espacio), pero con muchos items se
// vuelve un tunel de scroll - esto abre la lista completa con espacio real,
// sin tocar los datos de cobro (esos se quedan en el panel de abajo).
import { NxButton, NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import type { useSaleCheckout } from '../composables/useSaleCheckout'
import CartItemsList from './CartItemsList.vue'

const props = defineProps<{
  modelValue: boolean
  checkout: ReturnType<typeof useSaleCheckout>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close(): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="`Carrito (${checkout.itemCount.value})`"
    size="lg"
    @update:model-value="close"
  >
    <CartItemsList :checkout="checkout" />

    <template #footer>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs text-slate-500">Total</p>
          <p class="text-lg font-bold text-slate-900">
            {{ formatCop(props.checkout.totals.value?.grandTotal ?? 0) }}
          </p>
        </div>
        <NxButton @click="close">Seguir</NxButton>
      </div>
    </template>
  </NxModal>
</template>
