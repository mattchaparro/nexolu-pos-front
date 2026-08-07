<script setup lang="ts">
import type { Business } from '@/types/business'
import { NxButton } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import type { useSaleCheckout } from '../composables/useSaleCheckout'
import CartLineRow from './CartLineRow.vue'
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
  eslint-disable vue/no-mutating-props -- `checkout` es el objeto que
  devuelve useSaleCheckout() (una bolsa de refs + metodos, no un valor
  primitivo): mutar checkout.algo.value desde aca es el patron esperado
  para un composable pasado como prop (mismo caso que un store de Pinia),
  no la reasignacion de prop que la regla busca prevenir.
-->
<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between px-1 pb-2">
      <h2 class="text-sm font-semibold text-slate-900">
        Carrito <span class="text-slate-400">({{ checkout.itemCount.value }})</span>
      </h2>
      <button
        v-if="checkout.lines.value.length > 0"
        type="button"
        class="text-xs font-medium text-slate-400 hover:text-red-600"
        @click="checkout.reset()"
      >
        Vaciar
      </button>
    </div>

    <div
      v-if="checkout.lines.value.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400"
    >
      <i class="pi pi-shopping-cart text-3xl" />
      <p class="px-4 text-center text-sm">Toca un producto para agregarlo a la venta.</p>
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto">
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

      <div class="flex flex-col gap-3 border-t border-slate-200 pt-3">
        <CustomerFieldsSection
          :name="checkout.customerName.value"
          :phone="checkout.customerPhone.value"
          :identification="checkout.customerIdentification.value"
          :required="checkout.isCreditPaymentMethod.value"
          @update:name="checkout.customerName.value = $event"
          @update:phone="checkout.customerPhone.value = $event"
          @update:identification="checkout.customerIdentification.value = $event"
        />

        <label
          v-if="business.delivery_enabled"
          class="flex items-center gap-2 text-sm text-slate-700"
        >
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
          Cortesía (no cuenta como ingreso)
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
            <option
              v-for="discount in checkout.cartDiscounts.value"
              :key="discount.id"
              :value="discount.id"
            >
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

        <NxButton
          size="lg"
          :disabled="!checkout.canSubmit.value"
          :loading="submitting"
          @click="emit('submit')"
        >
          {{ submitLabel() }}
        </NxButton>
      </div>
    </template>
  </div>
</template>
