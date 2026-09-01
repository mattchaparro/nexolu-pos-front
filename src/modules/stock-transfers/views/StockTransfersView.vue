<script setup lang="ts">
// Historial de traslados entre sedes.
//
// Con una sede activa el backend devuelve los traslados en las DOS
// direcciones (lo que mando y lo que le llego, ver StockTransferController):
// filtrar solo por origen dejaria a la sede que recibe sin saber de donde
// salio lo que le entro al inventario.
import { computed, ref } from 'vue'

import type { StockTransfer } from '@/types/stockTransfer'
import { NxButton, NxCard, NxColumn, NxDataTable, NxPageHeader } from '@/ui'

import { useStockTransfers } from '../composables/useStockTransfers'

const page = ref(1)
const transfersQuery = useStockTransfers(page)

const transfers = computed(() => transfersQuery.data.value?.data ?? [])
const meta = computed(() => transfersQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function itemsSummary(transfer: StockTransfer): string {
  const items = transfer.items ?? []
  if (items.length === 0) {
    return '—'
  }
  const first = items[0]
  const rest = items.length - 1
  const head = `${first.quantity} × ${first.name ?? 'producto'}`
  return rest > 0 ? `${head} y ${rest} más` : head
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NxPageHeader
        title="Traslados"
        subtitle="Movimientos de inventario entre sedes."
        icon="pi pi-arrow-right-arrow-left"
      />
      <NxButton icon="pi pi-plus" @click="$router.push({ name: 'stock-transfers.create' })">
        Nuevo traslado
      </NxButton>
    </div>

    <NxCard>
      <NxDataTable
        :value="transfers"
        :loading="transfersQuery.isLoading.value"
        data-key="id"
        paginator
        :rows="20"
        :total-records="meta?.total ?? 0"
        lazy
        @page="onPage"
      >
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: StockTransfer }">
            <span class="text-slate-600">{{ formatDate(data.transferred_at) }}</span>
          </template>
        </NxColumn>

        <NxColumn header="Ruta">
          <template #body="{ data }: { data: StockTransfer }">
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium text-slate-800">{{ data.from_branch?.name ?? '—' }}</span>
              <i class="pi pi-arrow-right text-xs text-slate-400" />
              <span class="font-medium text-slate-800">{{ data.to_branch?.name ?? '—' }}</span>
            </div>
          </template>
        </NxColumn>

        <NxColumn header="Contenido">
          <template #body="{ data }: { data: StockTransfer }">
            <span class="text-slate-600">{{ itemsSummary(data) }}</span>
            <p v-if="data.notes" class="text-xs text-slate-400">{{ data.notes }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Registró">
          <template #body="{ data }: { data: StockTransfer }">
            <span class="text-slate-600">{{ data.user?.name ?? '—' }}</span>
          </template>
        </NxColumn>
      </NxDataTable>
    </NxCard>
  </div>
</template>
