<script setup lang="ts">
// Version movil de TabInProgressPanel: hoja inferior (3/4 de pantalla),
// igual que MobileCartSheet para el modo venta directa - misma identidad
// visual en los dos flujos. El flujo de cobro (cortesia/cargos/abonos/pago
// dividido/vuelto) vive en PaymentModal, que ya es un modal - no necesita
// su propia version movil aparte.
import type { Business } from '@/types/business'
import type { Sale, SaleItem } from '@/types/sale'
import type { BusinessTable } from '@/types/table'

import type { useNewItemsCart } from '../../open-tabs/composables/useNewItemsCart'
import TabInProgressPanel from './TabInProgressPanel.vue'

defineProps<{
  modelValue: boolean
  activeSale: Sale | null
  pendingTable: BusinessTable | null
  business: Business | undefined
  cart: ReturnType<typeof useNewItemsCart>
  submittingCart: boolean
  syncingItems: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  submit: []
  close: []
  'increment-item': [item: SaleItem]
  'decrement-item': [item: SaleItem]
  'remove-item': [item: SaleItem]
}>()

const newTabName = defineModel<string>('newTabName', { default: '' })
const newTabPhone = defineModel<string>('newTabPhone', { default: '' })
const newTabIsDelivery = defineModel<boolean>('newTabIsDelivery', { default: false })
</script>

<template>
  <template v-if="modelValue">
    <div class="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" @click="emit('cancel'); emit('update:modelValue', false)" />
    <div class="fixed inset-x-0 bottom-0 z-40 flex h-[75vh] flex-col rounded-t-2xl bg-white p-4 shadow-xl lg:hidden">
      <div class="flex justify-center pb-1">
        <span class="h-1 w-10 rounded-full bg-slate-200" />
      </div>
      <TabInProgressPanel
        v-model:new-tab-name="newTabName"
        v-model:new-tab-phone="newTabPhone"
        v-model:new-tab-is-delivery="newTabIsDelivery"
        :active-sale="activeSale"
        :pending-table="pendingTable"
        :business="business"
        :cart="cart"
        :submitting-cart="submittingCart"
        :syncing-items="syncingItems"
        @cancel="
          emit('cancel');
          emit('update:modelValue', false)
        "
        @submit="emit('submit')"
        @close="emit('close')"
        @increment-item="emit('increment-item', $event)"
        @decrement-item="emit('decrement-item', $event)"
        @remove-item="emit('remove-item', $event)"
      />
    </div>
  </template>
</template>
