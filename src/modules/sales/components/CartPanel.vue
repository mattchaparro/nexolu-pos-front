<script setup lang="ts">
import { ref } from 'vue'

import type { Business } from '@/types/business'

import type { useSaleCheckout } from '../composables/useSaleCheckout'
import CartCheckoutSection from './CartCheckoutSection.vue'
import CartItemsList from './CartItemsList.vue'
import CartItemsModal from './CartItemsModal.vue'

defineProps<{
  checkout: ReturnType<typeof useSaleCheckout>
  business: Business
  submitting: boolean
}>()

const emit = defineEmits<{ submit: [] }>()

const itemsModalOpen = ref(false)
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between px-1 pb-2">
      <h2 class="text-sm font-semibold text-slate-900">
        Carrito <span class="text-slate-400">({{ checkout.itemCount.value }})</span>
      </h2>
      <div class="flex items-center gap-1">
        <button
          v-if="checkout.lines.value.length > 0"
          type="button"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Ver todos los items"
          @click="itemsModalOpen = true"
        >
          <i class="pi pi-expand text-sm" />
        </button>
        <button
          v-if="checkout.lines.value.length > 0"
          type="button"
          class="px-1 text-xs font-medium text-slate-400 hover:text-red-600"
          @click="checkout.reset()"
        >
          Vaciar
        </button>
      </div>
    </div>

    <div v-if="checkout.lines.value.length === 0" class="flex flex-1">
      <CartItemsList :checkout="checkout" />
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto">
        <CartItemsList :checkout="checkout" />
      </div>

      <div class="border-t border-slate-200 pt-3">
        <CartCheckoutSection
          :checkout="checkout"
          :business="business"
          :submitting="submitting"
          @submit="emit('submit')"
        />
      </div>
    </template>

    <CartItemsModal v-model="itemsModalOpen" :checkout="checkout" />
  </div>
</template>
