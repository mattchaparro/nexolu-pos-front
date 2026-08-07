<script setup lang="ts">
import type { Business } from '@/types/business'
import { NxButton } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import type { useSaleCheckout } from '../composables/useSaleCheckout'
import CustomerFieldsSection from './CustomerFieldsSection.vue'
import PaymentMethodPicker from './PaymentMethodPicker.vue'
import SaleTotalsSummary from './SaleTotalsSummary.vue'

const props = defineProps<{
  checkout: ReturnType<typeof useSaleCheckout>
  business: Business
  submitting: boolean
}>()

const emit = defineEmits<{ submit: [] }>()

function submitLabel(): string {
  if (props.checkout.isNonRevenue.value) {
    return 'Registrar cortesía'
  }
  const total = props.checkout.totals.value?.grandTotal ?? 0
  return `Cobrar ${formatCop(total)}`
}
</script>

<!--
  eslint-disable vue/no-mutating-props -- ver la misma nota en CartPanel.vue:
  `checkout` es la bolsa de refs de useSaleCheckout(), no un valor primitivo.
-->
<template>
  <div class="flex flex-col gap-3">
    <CustomerFieldsSection
      :name="checkout.customerName.value"
      :phone="checkout.customerPhone.value"
      :identification="checkout.customerIdentification.value"
      :required="checkout.isCreditPaymentMethod.value"
      @update:name="checkout.customerName.value = $event"
      @update:phone="checkout.customerPhone.value = $event"
      @update:identification="checkout.customerIdentification.value = $event"
    />

    <label v-if="business.delivery_enabled" class="flex items-center gap-2 text-sm text-slate-700">
      <input
        v-model="checkout.isDelivery.value"
        type="checkbox"
        class="h-4 w-4 rounded accent-indigo-600"
      />
      Domicilio ({{ formatCop(business.delivery_fee) }})
    </label>

    <label class="flex items-center gap-2 text-sm text-slate-700">
      <input
        v-model="checkout.isNonRevenue.value"
        type="checkbox"
        class="h-4 w-4 rounded accent-amber-500"
      />
      Cortesía
    </label>
    <input
      v-if="checkout.isNonRevenue.value"
      v-model="checkout.nonRevenueReason.value"
      type="text"
      placeholder="Motivo de la cortesía"
      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

    <div
      v-if="business.charges.service_charge_enabled || business.charges.ipoconsumo_enabled"
      class="flex flex-col gap-1.5"
    >
      <label
        v-if="business.charges.service_charge_enabled"
        class="flex items-center gap-2 text-sm text-slate-700"
      >
        <input
          v-model="checkout.applyServiceCharge.value"
          type="checkbox"
          class="h-4 w-4 rounded accent-indigo-600"
        />
        Servicio ({{ business.charges.service_charge_rate }}%)
      </label>
      <label
        v-if="business.charges.ipoconsumo_enabled"
        class="flex items-center gap-2 text-sm text-slate-700"
      >
        <input
          v-model="checkout.applyIpoconsumo.value"
          type="checkbox"
          class="h-4 w-4 rounded accent-indigo-600"
        />
        Ipoconsumo ({{ business.charges.ipoconsumo_rate }}%)
      </label>
    </div>

    <PaymentMethodPicker
      v-if="!checkout.isNonRevenue.value"
      :methods="business.payment_methods"
      :model-value="checkout.paymentMethod.value"
      @update:model-value="checkout.paymentMethod.value = $event"
    />

    <SaleTotalsSummary v-if="checkout.totals.value" :totals="checkout.totals.value" />

    <NxButton size="lg" :disabled="!checkout.canSubmit.value" :loading="submitting" @click="emit('submit')">
      {{ submitLabel() }}
    </NxButton>
  </div>
</template>
