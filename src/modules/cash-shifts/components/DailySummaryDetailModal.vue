<script setup lang="ts">
// "Ver detalle" del dia que se esta cerrando: la misma matriz canal x medio
// de pago de Resumen del dia (ventas/servicios/apartados/fiados cobrados,
// cada uno desglosado por como entro la plata), pero acotada a un solo dia
// y en un modal - el dueño la pidio justo aca, en Cierre de caja, para ver
// de donde sale el total antes de confirmar el arqueo sin tener que
// navegar a otra pantalla.
import { computed, toRef } from 'vue'

import { useDailySummary } from '@/modules/daily-summary/composables/useDailySummary'
import type { IncomeChannel } from '@/types/dailySummary'
import { NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{
  modelValue: boolean
  date: string
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()

const dateRef = toRef(props, 'date')
const summaryQuery = useDailySummary(dateRef, dateRef)

const visibleChannels = computed<IncomeChannel[]>(() => {
  const summary = summaryQuery.data.value
  if (!summary) {
    return []
  }
  return summary.channels.filter((channel) => channel.key === 'sales' || summary.channels_enabled[channel.key])
})

const paymentColumns = computed(() => summaryQuery.data.value?.payment_breakdown ?? [])

function channelAmount(channel: IncomeChannel, methodId: string): number {
  return channel.by_payment_method.find((m) => m.id === methodId)?.total ?? 0
}

function columnTotal(methodId: string): number {
  return visibleChannels.value.reduce((sum, channel) => sum + channelAmount(channel, methodId), 0)
}

const grandTotal = computed(() => visibleChannels.value.reduce((sum, channel) => sum + channel.total, 0))
</script>

<template>
  <NxModal :model-value="modelValue" title="Detalle del día" size="lg" @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="summaryQuery.isPending.value" class="h-48 animate-pulse rounded-xl bg-slate-100" />

    <p v-else-if="summaryQuery.isError.value" class="py-6 text-center text-sm text-red-600">
      No pudimos cargar el detalle de este día.
    </p>

    <div v-else class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        {{ date }} · Ingresos totales: <strong class="text-slate-900">{{ formatCop(grandTotal) }}</strong>
      </p>

      <div class="overflow-x-auto">
        <table class="w-full min-w-max text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
              <th class="py-2 pr-4">Canal</th>
              <th v-for="col in paymentColumns" :key="col.id" class="py-2 pr-4 text-right">{{ col.label }}</th>
              <th class="py-2 pr-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="channel in visibleChannels" :key="channel.key" class="border-b border-slate-100">
              <td class="py-2 pr-4 font-medium text-slate-700">
                {{ channel.label }}
                <span class="ml-1 text-xs font-normal text-slate-400">({{ channel.count }})</span>
              </td>
              <td v-for="col in paymentColumns" :key="col.id" class="py-2 pr-4 text-right text-slate-600">
                {{ formatCop(channelAmount(channel, col.id)) }}
              </td>
              <td class="py-2 pr-4 text-right font-semibold text-slate-900">{{ formatCop(channel.total) }}</td>
            </tr>
            <tr v-if="visibleChannels.length === 0">
              <td class="py-4 text-center text-sm text-slate-400" :colspan="paymentColumns.length + 2">
                Sin ingresos este día.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="visibleChannels.length > 0">
            <tr class="border-t-2 border-slate-200 font-semibold text-slate-900">
              <td class="py-2 pr-4">Total</td>
              <td v-for="col in paymentColumns" :key="col.id" class="py-2 pr-4 text-right">{{ formatCop(columnTotal(col.id)) }}</td>
              <td class="py-2 pr-4 text-right">{{ formatCop(grandTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </NxModal>
</template>
