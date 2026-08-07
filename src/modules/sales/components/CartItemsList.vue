<script setup lang="ts">
import type { useSaleCheckout } from '../composables/useSaleCheckout'
import CartLineRow from './CartLineRow.vue'

defineProps<{
  checkout: ReturnType<typeof useSaleCheckout>
}>()
</script>

<!--
  eslint-disable vue/no-mutating-props -- ver la misma nota en CartPanel.vue:
  `checkout` es la bolsa de refs de useSaleCheckout(), no un valor primitivo.
-->
<template>
  <div
    v-if="checkout.lines.value.length === 0"
    class="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-slate-400"
  >
    <i class="pi pi-shopping-cart text-3xl" />
    <p class="px-4 text-center text-sm">Toca un producto para agregarlo a la venta.</p>
  </div>
  <div v-else>
    <CartLineRow
      v-for="line in checkout.totals.value?.lines ?? []"
      :key="line.cartKey"
      :line="line"
      :item-discounts="checkout.itemDiscounts.value"
      @update:quantity="checkout.setQuantity(line.cartKey, $event)"
      @update:discount-id="checkout.setLineDiscount(line.cartKey, $event)"
      @update:unit-price="checkout.setLineUnitPrice(line.cartKey, $event)"
      @remove="checkout.removeLine(line.cartKey)"
    />
  </div>
</template>
