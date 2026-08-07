<script setup lang="ts">
import type { useNewItemsCart } from '../composables/useNewItemsCart'
import NewItemsCartLineRow from './NewItemsCartLineRow.vue'

defineProps<{
  cart: ReturnType<typeof useNewItemsCart>
}>()
</script>

<template>
  <div v-if="cart.lines.value.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-slate-400">
    <i class="pi pi-shopping-bag text-3xl" />
    <p class="px-4 text-center text-sm">Toca un producto para agregarlo.</p>
  </div>
  <div v-else class="divide-y divide-slate-100">
    <NewItemsCartLineRow
      v-for="line in cart.lines.value"
      :key="line.product.id"
      :line="line"
      @update:quantity="cart.setQuantity(line.product.id, $event)"
      @remove="cart.removeLine(line.product.id)"
    />
  </div>
</template>
