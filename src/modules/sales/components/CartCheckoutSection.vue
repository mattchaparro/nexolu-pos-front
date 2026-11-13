<script setup lang="ts">
import type { Business } from '@/types/business'
import { NxButton } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import type { useSaleCheckout } from '../composables/useSaleCheckout'
import CustomerFieldsSection from './CustomerFieldsSection.vue'
import SaleTotalsSummary from './SaleTotalsSummary.vue'

const props = defineProps<{
  checkout: ReturnType<typeof useSaleCheckout>
  business: Business
  submitting: boolean
}>()

const emit = defineEmits<{ submit: [] }>()

// Cortesia/cargos/domicilio/descuento de cuenta se resuelven/muestran en
// PaymentModal al tocar este boton, no antes - el carrito solo compromete
// lo que ya esta en el (items, con su descuento por linea si aplica), ver
// la nota en useSaleCheckout.ts.
function submitLabel(): string {
  const total = props.checkout.totals.value?.itemsTotal ?? 0
  return `Cobrar ${formatCop(total)}`
}
</script>

<!--
  eslint-disable vue/no-mutating-props -- ver la misma nota en CartPanel.vue:
  `checkout` es la bolsa de refs de useSaleCheckout(), no un valor primitivo.
-->
<template>
  <div class="flex flex-col gap-3">
    <label
      v-if="business.delivery_enabled"
      class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
    >
      <span class="flex items-center gap-2 font-medium">
        <input
          v-model="checkout.isDelivery.value"
          type="checkbox"
          class="h-4 w-4 rounded accent-indigo-600"
        />
        <i class="pi pi-truck text-slate-500" />
        Domicilio
      </span>
      <span class="font-semibold">+{{ formatCop(business.delivery_fee) }}</span>
    </label>

    <CustomerFieldsSection
      :name="checkout.customerName.value"
      :phone="checkout.customerPhone.value"
      :identification="checkout.customerIdentification.value"
      :address="checkout.deliveryAddress.value"
      :client-address="checkout.clientId.value !== null ? checkout.clientAddress.value : null"
      :save-address="checkout.saveAddressToClient.value"
      :delivery="checkout.isDelivery.value"
      :required="false"
      @update:name="checkout.setCustomerName($event)"
      @update:phone="checkout.setCustomerPhone($event)"
      @update:identification="checkout.setCustomerIdentification($event)"
      @update:address="checkout.deliveryAddress.value = $event"
      @update:save-address="checkout.saveAddressToClient.value = $event"
      @select-client="checkout.applyClient($event)"
    />

    <div v-if="checkout.cartDiscounts.value.length > 0" class="flex flex-col gap-1">
      <label class="text-xs font-medium text-slate-500">Descuento de la cuenta</label>
      <select
        class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        :value="checkout.cartDiscountId.value ?? ''"
        @change="
          checkout.cartDiscountId.value = ($event.target as HTMLSelectElement).value
            ? Number(($event.target as HTMLSelectElement).value)
            : null
        "
      >
        <option value="">Sin descuento</option>
        <option v-for="discount in checkout.cartDiscounts.value" :key="discount.id" :value="discount.id">
          {{ discount.name }}
        </option>
      </select>
    </div>

    <SaleTotalsSummary v-if="checkout.totals.value" :totals="checkout.totals.value" />

    <NxButton size="lg" :disabled="!checkout.canSubmit.value" :loading="submitting" @click="emit('submit')">
      {{ submitLabel() }}
    </NxButton>
  </div>
</template>
