<script setup lang="ts">
// Solo lectura de las plantillas de WhatsApp (Meta) y los Flows que este POS
// sabe usar - consume WhatsAppTemplateController::index (nexolu-pos-api),
// que lee directo de config/services.php. Editar el nombre real o agregar
// una nueva sigue siendo un cambio de config/env + código (cada plantilla
// tiene sus variables hardcodeadas en el sitio que la usa) - esta pantalla
// es solo para verlas de un vistazo, no para editarlas.
import type { WhatsAppFlowEntry, WhatsAppTemplateEntry, WhatsAppTemplateStatus } from '@/types/superadmin/whatsappTemplate'
import { NxColumn, NxDataTable, NxPageHeader } from '@/ui'

import { useWhatsAppTemplates } from '../composables/useWhatsAppTemplates'

const templatesQuery = useWhatsAppTemplates()

const statusBadge: Record<WhatsAppTemplateStatus, { label: string; class: string }> = {
  configured: { label: 'Configurada', class: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pendiente', class: 'bg-amber-100 text-amber-700' },
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader title="Plantillas de WhatsApp" icon="pi pi-comments" compact />

    <div v-if="templatesQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="templatesQuery.data.value">
      <div>
        <p class="mb-2 text-sm font-semibold text-slate-700">Plantillas de mensaje</p>
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <NxDataTable :value="templatesQuery.data.value.templates">
            <template #empty>
              <p class="py-6 text-center text-sm text-slate-400">No hay plantillas configuradas.</p>
            </template>
            <NxColumn header="Clave">
              <template #body="{ data }: { data: WhatsAppTemplateEntry }">
                <code class="text-xs text-slate-600">{{ data.key }}</code>
              </template>
            </NxColumn>
            <NxColumn header="Nombre en Meta">
              <template #body="{ data }: { data: WhatsAppTemplateEntry }">
                <span v-if="data.name" class="font-mono text-xs">{{ data.name }}</span>
                <span v-else class="text-xs text-slate-400">—</span>
              </template>
            </NxColumn>
            <NxColumn header="Idioma">
              <template #body="{ data }: { data: WhatsAppTemplateEntry }">
                <span class="text-xs text-slate-500">{{ data.lang ?? '—' }}</span>
              </template>
            </NxColumn>
            <NxColumn header="Descripción / dispara">
              <template #body="{ data }: { data: WhatsAppTemplateEntry }">
                <div class="min-w-0">
                  <p class="text-sm">{{ data.description ?? '—' }}</p>
                  <p v-if="data.triggered_by" class="truncate font-mono text-xs text-slate-400">{{ data.triggered_by }}</p>
                </div>
              </template>
            </NxColumn>
            <NxColumn header="Estado">
              <template #body="{ data }: { data: WhatsAppTemplateEntry }">
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap" :class="statusBadge[data.status].class">
                  {{ statusBadge[data.status].label }}
                </span>
              </template>
            </NxColumn>
          </NxDataTable>
        </div>
      </div>

      <div>
        <p class="mb-2 text-sm font-semibold text-slate-700">WhatsApp Flows</p>
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <NxDataTable :value="templatesQuery.data.value.flows">
            <template #empty>
              <p class="py-6 text-center text-sm text-slate-400">No hay flows configurados.</p>
            </template>
            <NxColumn header="Clave">
              <template #body="{ data }: { data: WhatsAppFlowEntry }">
                <code class="text-xs text-slate-600">{{ data.key }}</code>
              </template>
            </NxColumn>
            <NxColumn header="Flow ID">
              <template #body="{ data }: { data: WhatsAppFlowEntry }">
                <span v-if="data.id" class="font-mono text-xs">{{ data.id }}</span>
                <span v-else class="text-xs text-slate-400">—</span>
              </template>
            </NxColumn>
            <NxColumn header="Pantalla">
              <template #body="{ data }: { data: WhatsAppFlowEntry }">
                <span class="text-xs text-slate-500">{{ data.screen ?? '—' }}</span>
              </template>
            </NxColumn>
            <NxColumn header="Descripción / dispara">
              <template #body="{ data }: { data: WhatsAppFlowEntry }">
                <div class="min-w-0">
                  <p class="text-sm">{{ data.description ?? '—' }}</p>
                  <p v-if="data.triggered_by" class="truncate font-mono text-xs text-slate-400">{{ data.triggered_by }}</p>
                </div>
              </template>
            </NxColumn>
            <NxColumn header="Estado">
              <template #body="{ data }: { data: WhatsAppFlowEntry }">
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap" :class="statusBadge[data.status].class">
                  {{ statusBadge[data.status].label }}
                </span>
              </template>
            </NxColumn>
          </NxDataTable>
        </div>
      </div>
    </template>
  </div>
</template>
