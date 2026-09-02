<script setup lang="ts">
// Uso y costos del Asistente de IA. Consume AiUsageController::index
// (nexolu-pos-api), que cruza dos fuentes distintas a proposito:
//
// - Los MENSAJES salen de ai_usage_daily, que es contra lo que el POS
//   descuenta el cupo del negocio: es la verdad de lo que se factura.
// - El COSTO sale del IA Core, que es quien llama al proveedor del modelo.
//
// Por eso el costo puede venir en null (IA Core caido) mientras los mensajes
// siguen ahi. Un costo desconocido se muestra como "—", nunca como $0: leer
// "$0" en toda la tabla se entiende como "la IA no cuesta nada".
import { computed, ref } from 'vue'

import { NxButton, NxCard, NxColumn, NxDataTable, NxPageHeader, NxSwitch } from '@/ui'
import type { AiUnansweredRow, AiUsageBusinessRow } from '@/types/aiUsage'
import { formatCop } from '@/utils/formatCop'

import { useAiUsage, useMarkQuestionReviewed } from '../composables/useAiUsage'

const includeReviewed = ref(false)
const usageQuery = useAiUsage(includeReviewed)
const markReviewed = useMarkQuestionReviewed()

const summary = computed(() => usageQuery.data.value?.summary)

/** "—" y no "$0": el costo desconocido no es un costo de cero. */
function usd(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `$${value.toFixed(4)}`
}

const stateBadge: Record<AiUsageBusinessRow['state'], { label: string; class: string }> = {
  bloqueado: { label: 'Bloqueado', class: 'bg-red-100 text-red-700' },
  contratado: { label: 'Contratado', class: 'bg-emerald-100 text-emerald-700' },
  incluido: { label: 'Incluido', class: 'bg-slate-100 text-slate-600' },
}

/**
 * Margen del pack: lo que se cobra por el contra lo que cuesta atenderlo.
 * Es la cifra que dice si el addon deja plata, y la unica razon por la que
 * esta pantalla mira el costo en USD y el precio en pesos a la vez.
 */
const packMarginLabel = computed(() => {
  const cost = summary.value?.pack_cost_usd
  if (cost === null || cost === undefined) {
    return 'Costo del pack desconocido'
  }
  return `Cuesta ${usd(cost)} atenderlo`
})

function relativeDate(value: string): string {
  return value.slice(0, 10)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader title="Uso y costos IA" icon="pi pi-comments" compact />

    <div v-if="usageQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="summary">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Mensajes hoy</p>
          <p class="text-2xl font-bold text-slate-900">{{ summary.today.messages }}</p>
          <p class="text-xs text-slate-400">{{ summary.today.businesses }} negocios</p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Mensajes del mes</p>
          <p class="text-2xl font-bold text-slate-900">{{ summary.month.messages }}</p>
          <p class="text-xs text-slate-400">{{ summary.month.businesses }} negocios</p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Costo del mes</p>
          <p class="text-2xl font-bold text-slate-900">{{ usd(summary.month_cost_usd) }}</p>
          <p class="text-xs text-slate-400">
            {{ summary.cost_per_message_usd === null ? 'Sin dato del IA Core' : `${usd(summary.cost_per_message_usd)} por mensaje` }}
          </p>
        </NxCard>
        <NxCard>
          <p class="text-xs font-medium text-slate-500">Pack de {{ summary.pack_size }}</p>
          <p class="text-2xl font-bold text-slate-900">{{ formatCop(summary.pack_price_cop) }}</p>
          <p class="text-xs text-slate-400">{{ packMarginLabel }}</p>
        </NxCard>
      </div>

      <!-- Las preguntas sin responder van ARRIBA de la tabla de uso: es lo
           accionable de esta pantalla (cada linea es una herramienta que
           quiza falta), mientras que el uso es seguimiento. -->
      <NxCard>
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">Preguntas sin responder</p>
            <p class="text-xs text-slate-500">
              El Asistente respondió sin usar ninguna herramienta. Ojo: aquí también cae la charla
              suelta y las preguntas sobre el propio asistente. Antes de escribir una herramienta
              nueva, verifica que no exista ya.
            </p>
          </div>
          <label class="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600">
            <NxSwitch v-model="includeReviewed" />
            Ver revisadas
          </label>
        </div>

        <NxDataTable :value="usageQuery.data.value?.unanswered ?? []">
          <template #empty>
            <p class="py-6 text-center text-sm text-slate-400">
              No hay preguntas sin responder pendientes de revisar.
            </p>
          </template>
          <NxColumn header="Pregunta">
            <template #body="{ data }: { data: AiUnansweredRow }">
              <p class="text-sm font-medium text-slate-900">{{ data.question }}</p>
              <p v-if="data.answer" class="mt-0.5 text-xs text-slate-400">{{ data.answer }}</p>
            </template>
          </NxColumn>
          <NxColumn header="Veces">
            <template #body="{ data }: { data: AiUnansweredRow }">
              <span class="text-sm font-semibold text-slate-900">{{ data.times }}</span>
              <span class="ml-1 text-xs text-slate-400">en {{ data.businesses }} negocio(s)</span>
            </template>
          </NxColumn>
          <NxColumn header="Última vez">
            <template #body="{ data }: { data: AiUnansweredRow }">
              <span class="text-xs text-slate-500">{{ relativeDate(data.last_seen_at) }}</span>
            </template>
          </NxColumn>
          <NxColumn>
            <template #body="{ data }: { data: AiUnansweredRow }">
              <NxButton
                size="sm"
                variant="outline"
                :loading="markReviewed.isPending.value && markReviewed.variables.value === data.id"
                @click="markReviewed.mutate(data.id)"
              >
                Marcar revisada
              </NxButton>
            </template>
          </NxColumn>
        </NxDataTable>
      </NxCard>

      <NxCard>
        <p class="mb-3 text-sm font-semibold text-slate-900">Uso por negocio (mes en curso)</p>

        <NxDataTable :value="usageQuery.data.value?.businesses ?? []">
          <template #empty>
            <p class="py-6 text-center text-sm text-slate-400">Nadie ha usado el Asistente este mes.</p>
          </template>
          <NxColumn header="Negocio">
            <template #body="{ data }: { data: AiUsageBusinessRow }">
              <p class="text-sm font-semibold text-slate-900">{{ data.name }}</p>
              <p class="text-xs text-slate-400">{{ data.plan ?? 'sin plan' }}</p>
            </template>
          </NxColumn>
          <NxColumn header="Estado">
            <template #body="{ data }: { data: AiUsageBusinessRow }">
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="stateBadge[data.state].class">
                {{ stateBadge[data.state].label }}
              </span>
            </template>
          </NxColumn>
          <NxColumn header="Mensajes">
            <template #body="{ data }: { data: AiUsageBusinessRow }">
              <span class="text-sm font-semibold text-slate-900">{{ data.messages }}</span>
              <span class="text-xs text-slate-400"> / {{ data.monthly_quota }}</span>
              <p v-if="data.pack_balance > 0" class="text-xs text-emerald-600">
                +{{ data.pack_balance }} de paquetes
              </p>
            </template>
          </NxColumn>
          <NxColumn header="Costo">
            <template #body="{ data }: { data: AiUsageBusinessRow }">
              <span class="text-sm text-slate-700">{{ usd(data.cost_usd) }}</span>
            </template>
          </NxColumn>
          <NxColumn header="Último uso">
            <template #body="{ data }: { data: AiUsageBusinessRow }">
              <span class="text-xs text-slate-500">{{ relativeDate(data.last_used_on) }}</span>
            </template>
          </NxColumn>
        </NxDataTable>
      </NxCard>
    </template>
  </div>
</template>
