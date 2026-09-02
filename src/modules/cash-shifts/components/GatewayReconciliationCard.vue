<script setup lang="ts">
/**
 * El cuadre contra la pasarela, dentro del cierre de caja.
 *
 * Va aquí y no en una pantalla aparte porque este es el momento en que el
 * comerciante está contando: si el QR del datáfono cobró algo que nadie
 * registró, ahora todavía se acuerda de esa venta. Días después, cuando le
 * aparezca en el extracto de Bold, ya no.
 *
 * Se muestran las dos direcciones del descuadre porque significan cosas
 * distintas: un cobro sin venta es plata que entró sin registrarse (falta
 * una venta), y una venta sin cobro es una venta marcada como electrónica
 * que la pasarela no reporta (o se marcó mal, o el cobro no entró).
 */
import { computed } from 'vue'

import type { GatewayReconciliation } from '@/types/cashShift'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ data: GatewayReconciliation }>()

const diferencia = computed(() => props.data.gateway.total - props.data.pos.total)

function hora(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-slate-700">Cuadre con la pasarela</p>
        <p class="text-[11px] text-slate-400">
          Lo que registraste por medios electrónicos, contra lo que reporta tu pasarela.
        </p>
      </div>
      <span
        class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        :class="data.balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
      >
        {{ data.balanced ? 'Cuadra' : 'No cuadra' }}
      </span>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-3">
      <div class="rounded-lg bg-slate-50 px-3 py-2">
        <p class="text-[11px] text-slate-500">Tu POS</p>
        <p class="text-sm font-semibold text-slate-800">{{ formatCop(data.pos.total) }}</p>
        <p class="text-[11px] text-slate-400">
          {{ data.pos.count }} {{ data.pos.count === 1 ? 'venta' : 'ventas' }}
        </p>
      </div>
      <div class="rounded-lg bg-slate-50 px-3 py-2">
        <p class="text-[11px] text-slate-500">La pasarela</p>
        <p class="text-sm font-semibold text-slate-800">{{ formatCop(data.gateway.total) }}</p>
        <p class="text-[11px] text-slate-400">
          {{ data.gateway.count }} {{ data.gateway.count === 1 ? 'cobro' : 'cobros' }}
        </p>
      </div>
    </div>

    <p v-if="!data.balanced" class="mt-2 text-xs text-slate-500">
      Diferencia:
      <strong :class="diferencia >= 0 ? 'text-slate-800' : 'text-red-600'">
        {{ diferencia >= 0 ? '+' : '' }}{{ formatCop(diferencia) }}
      </strong>
    </p>

    <!-- Cobró la pasarela y el POS no lo tiene. Es el caso del QR pegado al
         datáfono: entró plata sin que nadie registrara la venta. -->
    <div v-if="data.unmatched_payments.length > 0" class="mt-3">
      <p class="text-xs font-semibold text-slate-600">Cobros que no están en tu POS</p>
      <ul class="mt-1 flex flex-col gap-1">
        <li
          v-for="(pago, index) in data.unmatched_payments"
          :key="index"
          class="flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs"
        >
          <span class="text-amber-800">
            {{ hora(pago.occurred_at) }}
            <template v-if="pago.payment_method"> · {{ pago.payment_method }}</template>
            <template v-if="pago.approval_number"> · aprob. {{ pago.approval_number }}</template>
          </span>
          <span class="font-semibold text-amber-900">{{ formatCop(pago.amount) }}</span>
        </li>
      </ul>
      <p class="mt-1 text-[11px] text-slate-400">
        Alguien cobró con el datáfono sin registrar la venta. Regístrala antes de cerrar.
      </p>
    </div>

    <!-- Y al revés. -->
    <div v-if="data.unmatched_sales.length > 0" class="mt-3">
      <p class="text-xs font-semibold text-slate-600">Ventas que la pasarela no reporta</p>
      <ul class="mt-1 flex flex-col gap-1">
        <li
          v-for="venta in data.unmatched_sales"
          :key="venta.id"
          class="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs"
        >
          <span class="text-slate-600">
            {{ hora(venta.created_at) }}
            <template v-if="venta.invoice_number"> · {{ venta.invoice_number }}</template>
            <template v-if="venta.payment_method"> · {{ venta.payment_method }}</template>
          </span>
          <span class="font-semibold text-slate-800">{{ formatCop(venta.total) }}</span>
        </li>
      </ul>
      <p class="mt-1 text-[11px] text-slate-400">
        O se marcaron con el medio equivocado, o el cobro no entró. Bold puede tardar hasta 10
        minutos en reportar.
      </p>
    </div>
  </div>
</template>
