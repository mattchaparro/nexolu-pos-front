<script setup lang="ts">
// Resumen del carrito: SOLO lo que hay en el carrito (subtotal de items,
// con su descuento por linea si aplica) - descuento de la cuenta, cargos
// (servicio/ipoconsumo) y domicilio se deciden y se muestran en
// PaymentModal al cobrar, no aca (antes aparecian aca como si ya
// estuvieran aplicados, pero solo el modal podia des/activarlos - dos
// lugares mostrando el "total a cobrar" con informacion distinta). Ver la
// nota en useSaleCheckout.ts.
import { formatCop } from '@/utils/formatCop'

import type { SaleTotals } from '../support/saleMath'

defineProps<{ totals: SaleTotals }>()
</script>

<template>
  <div class="flex flex-col gap-1 text-sm">
    <div v-if="totals.itemDiscountsTotal > 0" class="flex justify-between text-slate-500">
      <span>Subtotal</span>
      <span>{{ formatCop(totals.itemsSubtotal) }}</span>
    </div>
    <div v-if="totals.itemDiscountsTotal > 0" class="flex justify-between text-slate-500">
      <span>Descuentos por producto</span>
      <span>-{{ formatCop(totals.itemDiscountsTotal) }}</span>
    </div>
    <div
      class="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"
    >
      <span>Total del carrito</span>
      <span>{{ formatCop(totals.itemsTotal) }}</span>
    </div>
  </div>
</template>
