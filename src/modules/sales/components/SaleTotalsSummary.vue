<script setup lang="ts">
import { formatCop } from '@/utils/formatCop'

import type { SaleTotals } from '../support/saleMath'

defineProps<{ totals: SaleTotals }>()
</script>

<template>
  <div class="flex flex-col gap-1 text-sm">
    <div class="flex justify-between text-slate-500">
      <span>Subtotal</span>
      <span>{{ formatCop(totals.itemsSubtotal) }}</span>
    </div>
    <div v-if="totals.itemDiscountsTotal > 0" class="flex justify-between text-slate-500">
      <span>Descuentos por producto</span>
      <span>-{{ formatCop(totals.itemDiscountsTotal) }}</span>
    </div>
    <div v-if="totals.cartDiscountAmount > 0" class="flex justify-between text-slate-500">
      <span>Descuento de la cuenta</span>
      <span>-{{ formatCop(totals.cartDiscountAmount) }}</span>
    </div>
    <div v-if="totals.serviceChargeAmount > 0" class="flex justify-between text-slate-500">
      <span>Servicio</span>
      <span>{{ formatCop(totals.serviceChargeAmount) }}</span>
    </div>
    <div v-if="totals.ipoconsumoAmount > 0" class="flex justify-between text-slate-500">
      <span>Ipoconsumo</span>
      <span>{{ formatCop(totals.ipoconsumoAmount) }}</span>
    </div>
    <div v-if="totals.deliveryFee > 0" class="flex justify-between text-slate-500">
      <span>Domicilio</span>
      <span>{{ formatCop(totals.deliveryFee) }}</span>
    </div>
    <div
      class="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"
    >
      <span>Total</span>
      <span>{{ formatCop(totals.grandTotal) }}</span>
    </div>
  </div>
</template>
