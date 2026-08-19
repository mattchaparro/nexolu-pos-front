<script setup lang="ts">
// Historial de cierres + "Deshacer" para el caso que el dueño reporto:
// cerro la caja antes de tiempo por error. Solo aparece el boton cuando
// can_undo=true (el backend solo permite deshacer el cierre del mismo dia -
// ver CashClosingService::undoCashClosing) - fuera de ese dia, corregirlo
// es una decision administrativa, no un boton de un clic.
import { computed, ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { CashClosing } from '@/types/cashShift'
import { NxColumn, NxDataTable } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useCashClosingHistory } from '../composables/useCashClosing'
import { useCashClosingMutations } from '../composables/useCashClosingMutations'

const page = ref(1)
const historyQuery = useCashClosingHistory(page)
const meta = computed(() => historyQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const { notify } = useSystemAlert()
const { undoMutation } = useCashClosingMutations()

async function undo(closing: CashClosing): Promise<void> {
  if (!window.confirm(`¿Deshacer el cierre de caja del ${closing.date}? Esto reabre los turnos que cerró automáticamente.`)) {
    return
  }
  try {
    await undoMutation.mutateAsync(closing.id)
    notify('Cierre de caja deshecho')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos deshacer el cierre.'), 'error')
  }
}

function differenceClass(closing: CashClosing): string {
  if (Math.abs(closing.difference) < 1) {
    return 'text-emerald-600'
  }
  return closing.difference > 0 ? 'text-amber-600' : 'text-red-600'
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <NxDataTable
      :value="historyQuery.data.value?.data ?? []"
      :loading="historyQuery.isPending.value"
      paginator
      lazy
      :rows="20"
      :total-records="meta?.total ?? 0"
      :first="((meta?.current_page ?? 1) - 1) * 20"
      @page="onPage"
    >
      <template #empty>
        <p class="py-6 text-center text-sm text-slate-400">Todavía no hay cierres de caja.</p>
      </template>
      <NxColumn field="date" header="Fecha" />
      <NxColumn header="Ventas">
        <template #body="{ data }: { data: CashClosing }">{{ formatCop(data.total_sales) }}</template>
      </NxColumn>
      <NxColumn header="Esperado">
        <template #body="{ data }: { data: CashClosing }">{{ formatCop(data.expected_cash) }}</template>
      </NxColumn>
      <NxColumn header="Contado">
        <template #body="{ data }: { data: CashClosing }">{{ formatCop(data.actual_cash) }}</template>
      </NxColumn>
      <NxColumn header="Diferencia">
        <template #body="{ data }: { data: CashClosing }">
          <span class="font-semibold" :class="differenceClass(data)">{{ formatCop(data.difference) }}</span>
        </template>
      </NxColumn>
      <NxColumn header="Cerrado por">
        <template #body="{ data }: { data: CashClosing }">{{ data.closed_by_user?.full_name ?? '—' }}</template>
      </NxColumn>
      <NxColumn header="">
        <template #body="{ data }: { data: CashClosing }">
          <button
            v-if="data.can_undo"
            type="button"
            class="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            :disabled="undoMutation.isPending.value"
            @click="undo(data)"
          >
            Deshacer
          </button>
        </template>
      </NxColumn>
    </NxDataTable>
  </div>
</template>
