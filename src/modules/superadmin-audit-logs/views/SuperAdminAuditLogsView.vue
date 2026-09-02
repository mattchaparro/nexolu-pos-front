<script setup lang="ts">
// Auditoria GLOBAL de la plataforma: todas las acciones de todos los
// negocios. Consume SuperAdmin\AuditLogController (nexolu-pos-api).
//
// No es la misma pantalla que modules/audit-logs (esa esta acotada al
// negocio del usuario y filtra las acciones hechas por soporte). Aca se ven
// todas, con el negocio y con la marca de impersonacion, que es justo la
// pregunta que solo se puede responder desde plataforma: "esto lo hizo el
// dueño o lo hicimos nosotros por el".
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SuperAdminAuditLogEntry } from '@/types/auditLog'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { toLocalDateIso } from '@/utils/toLocalDateIso'

import { useSuperAdminAuditActions, useSuperAdminAuditLogs } from '../composables/useSuperAdminAuditLogs'
import { fetchSuperAdminAuditLogsCsv } from '../services/auditLogService'

const searchInput = ref('')
const search = ref('')
const action = ref<string | null>(null)
const businessIdInput = ref('')
const page = ref(1)

let debounce: number | undefined
watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})

// El backend espera un entero; el input es texto para poder dejarlo vacio.
const businessId = computed(() => {
  const parsed = Number.parseInt(businessIdInput.value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

watch([action, businessId], () => {
  page.value = 1
})

const logsQuery = useSuperAdminAuditLogs(search, action, businessId, page)
const actionsQuery = useSuperAdminAuditActions()
const meta = computed(() => logsQuery.data.value?.meta)

const actionOptions = computed(() =>
  Object.entries(actionsQuery.data.value ?? {})
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es')),
)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const expandedId = ref<number | null>(null)

function toggleDetails(entry: SuperAdminAuditLogEntry): void {
  expandedId.value = expandedId.value === entry.id ? null : entry.id
}

const { notify } = useSystemAlert()
const exporting = ref(false)

async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchSuperAdminAuditLogsCsv({
      search: search.value || undefined,
      action: action.value ?? undefined,
      business_id: businessId.value ?? undefined,
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auditoria-global-${toLocalDateIso()}.csv`
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
  <div class="flex flex-col gap-4">
    <NxPageHeader
      title="Auditoría"
      subtitle="Acciones sensibles de todos los negocios de la plataforma."
      icon="pi pi-shield"
      compact
    />

    <div class="flex flex-wrap items-end gap-3">
      <NxSelect
        v-model="action"
        :options="actionOptions"
        option-label="label"
        option-value="value"
        label="Tipo de acción"
        placeholder="Todas"
        class="min-w-[220px]"
        filter
        show-clear
      />
      <NxInput v-model="businessIdInput" label="ID de negocio" placeholder="Todos" class="w-32" />
      <NxInput
        v-model="searchInput"
        label="Buscar en el código de acción"
        class="min-w-[220px] flex-1"
        icon="pi pi-search"
        clearable
        blur-after-typing
      />
      <NxButton variant="outline" icon="pi pi-download" :loading="exporting" @click="exportCsv">
        Exportar CSV
      </NxButton>
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
          <p class="py-6 text-center text-sm text-slate-400">No hay acciones con esos criterios.</p>
        </template>

        <NxColumn header="Fecha">
          <template #body="{ data }: { data: SuperAdminAuditLogEntry }">
            <p class="text-sm text-slate-700">{{ formatDateTime(data.created_at) }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Acción">
          <template #body="{ data }: { data: SuperAdminAuditLogEntry }">
            <p class="text-sm font-semibold text-slate-900">{{ data.action_label }}</p>
            <p class="font-mono text-xs text-slate-400">{{ data.action }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Negocio">
          <template #body="{ data }: { data: SuperAdminAuditLogEntry }">
            <p v-if="data.business" class="text-sm text-slate-700">{{ data.business.name }}</p>
            <p v-else class="text-sm text-slate-400">—</p>
            <p v-if="data.business_id" class="font-mono text-xs text-slate-400">#{{ data.business_id }}</p>
          </template>
        </NxColumn>

        <NxColumn header="Usuario">
          <template #body="{ data }: { data: SuperAdminAuditLogEntry }">
            <p class="text-sm text-slate-700">{{ data.user?.name ?? 'Sistema' }}</p>
            <p v-if="data.user?.email" class="text-xs text-slate-400">{{ data.user.email }}</p>
            <!-- Sin esta marca, una accion hecha por soporte se lee como si
                 la hubiera hecho el dueño del negocio. -->
            <span
              v-if="data.impersonated_by_superadmin_id"
              class="mt-0.5 inline-block rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
            >
              Soporte suplantando
            </span>
          </template>
        </NxColumn>

        <NxColumn header="Detalle">
          <template #body="{ data }: { data: SuperAdminAuditLogEntry }">
            <NxButton
              v-if="data.details"
              size="sm"
              variant="outline"
              :icon="expandedId === data.id ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
              @click="toggleDetails(data)"
            />
            <pre
              v-if="expandedId === data.id"
              class="mt-2 max-w-md overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600"
            >{{ JSON.stringify(data.details, null, 2) }}</pre>
            <p v-if="expandedId === data.id" class="mt-1 font-mono text-xs text-slate-400">
              {{ data.method }} {{ data.url }} · {{ data.ip ?? 'sin IP' }}
            </p>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
