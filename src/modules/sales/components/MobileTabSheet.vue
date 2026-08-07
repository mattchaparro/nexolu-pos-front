<script setup lang="ts">
// Version movil de TabInProgressPanel: a pantalla completa, igual que
// MobileCartSheet para el modo venta directa. El flujo de cobro (cortesia/
// cargos/abonos/pago dividido) vive en CloseTabModal, que ya es un modal -
// no necesita su propia version movil aparte.
import type { Business } from '@/types/business'
import type { Sale } from '@/types/sale'
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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  submit: []
  close: []
}>()

const newTabName = defineModel<string>('newTabName', { default: '' })
const newTabPhone = defineModel<string>('newTabPhone', { default: '' })
const newTabIsDelivery = defineModel<boolean>('newTabIsDelivery', { default: false })
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-40 flex flex-col bg-white p-4 lg:hidden">
    <TabInProgressPanel
      v-model:new-tab-name="newTabName"
      v-model:new-tab-phone="newTabPhone"
      v-model:new-tab-is-delivery="newTabIsDelivery"
      :active-sale="activeSale"
      :pending-table="pendingTable"
      :business="business"
      :cart="cart"
      :submitting-cart="submittingCart"
      @cancel="
        emit('cancel');
        emit('update:modelValue', false)
      "
      @submit="emit('submit')"
      @close="emit('close')"
    />
  </div>
</template>
