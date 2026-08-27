<script setup lang="ts">
// Auditoria - historial de acciones sensibles del negocio (ventas anuladas,
// cierres de caja, gastos, productos, etc). Puerto de Admin/Logs/AuditActions.vue
// del legacy, sin la vista "superadmin" (esa ya existe aparte en el panel
// de SuperAdmin) - esta pantalla siempre esta acotada al negocio del
// usuario autenticado (ver AuditLogController::index() en el backend).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { AuditLogEntry } from '@/types/auditLog'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useAuditLogs } from '../composables/useAuditLogs'
import { fetchAuditLogsCsv } from '../services/auditLogService'

const searchInput = ref('')
const search = ref('')
const page = ref(1)
let debounce: number | undefined

watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})

const logsQuery = useAuditLogs(search, page)
const meta = computed(() => logsQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const { notify } = useSystemAlert()
const exporting = ref(false)

async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchAuditLogsCsv(search.value || undefined)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auditoria-${toLocalDateIso()}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos exportar la auditoría.'))
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Auditoría" icon="pi pi-shield" compact />

    <div class="flex flex-wrap items-end gap-3">
      <NxInput v-model="searchInput" label="Buscar por tipo de acción" class="min-w-[240px] flex-1" icon="pi pi-search" clearable blur-after-typing />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" @click="exportCsv">Exportar CSV</NxButton>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="logsQuery.data.value?.data ?? []"
        :loading="logsQuery.isPending.value"
        paginator
        lazy
        :rows="30"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 30"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Todavía no hay acciones registradas.</p>
        </template>
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: AuditLogEntry }">
            <p class="text-sm text-slate-700">{{ formatDateTime(data.created_at) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Acción">
          <template #body="{ data }: { data: AuditLogEntry }">
            <p class="text-sm font-semibold text-slate-900">{{ data.action_label }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Usuario">
          <template #body="{ data }: { data: AuditLogEntry }">
            <p class="text-sm text-slate-700">{{ data.user?.name ?? 'Sistema' }}</p>
            <p v-if="data.user?.email" class="text-xs text-slate-400">{{ data.user.email }}</p>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
