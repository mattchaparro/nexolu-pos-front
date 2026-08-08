<script setup lang="ts">
// Version movil del carrito: hoja inferior (bottom sheet, 3/4 de la
// pantalla por defecto) en 2 pasos (items -> datos previos al cobro) en vez
// de todo apilado en una sola pantalla larga - en un celular la seccion
// previa al cobro (cliente, domicilio, descuento, totales) sumada a los
// items del carrito no entra sin scrollear demasiado. Cortesia/cargos/medio
// de pago/vuelto se resuelven en PaymentModal al tocar "Cobrar", no aca -
// ver la nota en useSaleCheckout.ts. El panel de escritorio (CartPanel.vue)
// no tiene el problema de espacio (tiene alto de sobra) asi que se queda en
// una sola vista, con el boton de expandir para el listado de items en vez
// de pasos. `expanded` deja crecer la hoja a pantalla completa cuando el
// listado de items es largo, sin perder el gesto de "hoja" (no tapa todo
// de entrada como antes).
import { ref, watch } from 'vue'

import type { Business } from '@/types/business'
import { formatCop } from '@/utils/formatCop'

import type { useSaleCheckout } from '../composables/useSaleCheckout'
import CartCheckoutSection from './CartCheckoutSection.vue'
import CartItemsList from './CartItemsList.vue'

const props = defineProps<{
  modelValue: boolean
  checkout: ReturnType<typeof useSaleCheckout>
  business: Business
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: []
}>()

const step = ref<'items' | 'checkout'>('items')
const expanded = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      step.value = 'items'
      expanded.value = false
    }
  },
)

function close(): void {
  emit('update:modelValue', false)
}
</script>

<!--
  eslint-disable vue/no-mutating-props -- ver la misma nota en CartPanel.vue:
  `checkout` es la bolsa de refs de useSaleCheckout(), no un valor primitivo.
-->
<template>
  <template v-if="modelValue">
    <div class="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" @click="close" />
    <div
      class="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl bg-white shadow-xl lg:hidden"
      :class="expanded ? 'top-0 rounded-t-none' : 'h-[75vh]'"
    >
      <div class="flex justify-center pt-2" :class="expanded ? 'hidden' : ''">
        <span class="h-1 w-10 rounded-full bg-slate-200" />
      </div>
      <div class="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <button
          v-if="step === 'checkout'"
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          title="Volver al carrito"
          @click="step = 'items'"
        >
          <i class="pi pi-arrow-left" />
        </button>
        <h2 class="text-sm font-semibold text-slate-900">
          {{ step === 'items' ? 'Carrito' : 'Cobrar' }}
          <span class="text-slate-400">({{ checkout.itemCount.value }})</span>
        </h2>
        <div class="ml-auto flex items-center gap-1">
          <button
            v-if="step === 'items' && checkout.lines.value.length > 0"
            type="button"
            class="px-1 text-xs font-medium text-slate-400 hover:text-red-600"
            @click="checkout.reset()"
          >
            Vaciar
          </button>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            :title="expanded ? 'Reducir' : 'Expandir'"
            @click="expanded = !expanded"
          >
            <i :class="expanded ? 'pi pi-angle-double-down' : 'pi pi-angle-double-up'" />
          </button>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            title="Cerrar"
            @click="close"
          >
            <i class="pi pi-times" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        <CartItemsList v-if="step === 'items'" :checkout="checkout" />
        <CartCheckoutSection
          v-else
          :checkout="checkout"
          :business="business"
          :submitting="submitting"
          @submit="emit('submit')"
        />
      </div>

      <div v-if="step === 'items' && checkout.lines.value.length > 0" class="border-t border-slate-200 p-4">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-lg bg-indigo-600 px-4 py-3 text-white"
          @click="step = 'checkout'"
        >
          <span class="text-sm font-medium">Continuar</span>
          <span class="font-bold">{{ formatCop(checkout.totals.value?.grandTotal ?? 0) }}</span>
        </button>
      </div>
    </div>
  </template>
</template>
