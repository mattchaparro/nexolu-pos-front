<script setup lang="ts">
// Version movil del carrito: hoja inferior (bottom sheet, 3/4 de la
// pantalla por defecto), una sola vista con items + datos previos al cobro
// (cliente, domicilio, descuento, totales) juntos y scrolleables, igual que
// el panel de escritorio (CartPanel.vue) - antes eran 2 pasos ("Continuar"
// -> pantalla de checkout aparte) y esa navegacion extra no aportaba nada,
// solo un toque mas entre el carrito y el modal de cobro. El boton final
// de CartCheckoutSection ("Cobrar $...") abre PaymentModal directo. `expanded`
// deja crecer la hoja a pantalla completa cuando el listado de items es
// largo, sin perder el gesto de "hoja" (no tapa todo de entrada como antes).
//
// Alto segun el contenido, con tope en 85dvh (antes era 3/4 de pantalla
// fijo): una tienda de celulares vende 1-2 productos por venta y la hoja
// tapaba la grilla con un blanco enorme (reporte de Central Cell), mientras
// que una tienda o restaurante llena 8-10 items y ahi si necesita el alto.
// Crecer con el contenido sirve a los dos sin configurar nada por negocio.
// Pasado el tope, la lista de items es lo que hace scroll (min-h-0).
import { ref, watch } from 'vue'

import type { Business } from '@/types/business'

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

const expanded = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
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
      :class="expanded ? 'top-0 rounded-t-none' : 'max-h-[85dvh]'"
    >
      <div class="flex justify-center pt-2" :class="expanded ? 'hidden' : ''">
        <span class="h-1 w-10 rounded-full bg-slate-200" />
      </div>
      <div class="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <h2 class="text-sm font-semibold text-slate-900">
          Carrito <span class="text-slate-400">({{ checkout.itemCount.value }})</span>
        </h2>
        <div class="ml-auto flex items-center gap-1">
          <button
            v-if="checkout.lines.value.length > 0"
            type="button"
            class="px-1 text-xs font-medium text-slate-400 hover:text-red-600"
            @click="checkout.reset()"
          >
            Vaciar
          </button>
          <!-- h-9 w-9: el area tactil de antes (p-1.5 sobre un icono de 16px)
               era de ~28px, por debajo de lo que un dedo acierta a la primera. -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            :title="expanded ? 'Reducir' : 'Expandir'"
            @click="expanded = !expanded"
          >
            <i :class="expanded ? 'pi pi-angle-double-down text-base' : 'pi pi-angle-double-up text-base'" />
          </button>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            title="Cerrar"
            @click="close"
          >
            <i class="pi pi-times text-base" />
          </button>
        </div>
      </div>

      <div class="min-h-0 overflow-y-auto p-4" :class="expanded ? 'flex-1' : ''">
        <CartItemsList :checkout="checkout" />
      </div>

      <div v-if="checkout.lines.value.length > 0" class="shrink-0 border-t border-slate-200 p-4 pt-3">
        <CartCheckoutSection
          :checkout="checkout"
          :business="business"
          :submitting="submitting"
          @submit="emit('submit')"
        />
      </div>
    </div>
  </template>
</template>
