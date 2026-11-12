<script setup lang="ts">
// Bitacora de todo lo que la app manda hacia afuera (email + WhatsApp) -
// consume CommunicationController::index (nexolu-pos-api), que ya unifica
// email_logs/whatsapp_logs. Filtrable por canal y negocio, para soporte
// ("¿le llego esto a este negocio?").
import { computed, ref, watch } from 'vue'

import type { CommunicationChannel, CommunicationLogEntry } from '@/types/superadmin/communication'
import { NxButton, NxColumn, NxDataTable, NxPageHeader, NxSelect } from '@/ui'

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import BroadcastModal from '../components/BroadcastModal.vue'
import SendCommunicationModal from '../components/SendCommunicationModal.vue'
import { fetchAnnouncements, setAnnouncementActive, type Announcement } from '../services/announcementService'
import { useBusinessSearch } from '../composables/useBusinessSearch'
import { useCommunications } from '../composables/useCommunications'

const channel = ref<CommunicationChannel | ''>('')
const businessId = ref<number | null>(null)
const businessSearch = ref('')
const page = ref(1)
const composeModalOpen = ref(false)
const broadcastModalOpen = ref(false)

// Difusiones: el aviso que ven los negocios al entrar al POS (+ WhatsApp).
const announcementsQuery = useQuery({ queryKey: ['superadmin', 'announcements'], queryFn: fetchAnnouncements })
const announcements = computed(() => announcementsQuery.data.value ?? [])
const queryClient = useQueryClient()
const toggleMutation = useMutation({
  mutationFn: (item: Announcement) => setAnnouncementActive(item, !item.active),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin', 'announcements'] }),
})
const SCOPE_LABEL: Record<string, string> = { in_use: 'En uso', active: 'Todos los activos', selected: 'Elegidos' }

const channelOptions = [
  { value: '', label: 'Todos los canales' },
  { value: 'email', label: 'Correo' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

const businessSearchQuery = useBusinessSearch(businessSearch)
const businessOptions = computed<Array<{ id: number | null; name: string }>>(() => [
  { id: null, name: 'Todos los negocios' },
  ...(businessSearchQuery.data.value ?? []),
])

watch([channel, businessId], () => {
  page.value = 1
})

const communicationsQuery = useCommunications(channel, businessId, page)
const meta = computed(() => communicationsQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const channelBadge: Record<CommunicationChannel, { label: string; class: string }> = {
  email: { label: 'Correo', class: 'bg-sky-100 text-sky-700' },
  whatsapp: { label: 'WhatsApp', class: 'bg-emerald-100 text-emerald-700' },
}

const statusBadge: Record<'sent' | 'failed', { label: string; class: string }> = {
  sent: { label: 'Enviado', class: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Fallido', class: 'bg-red-100 text-red-700' },
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Comunicaciones" icon="pi pi-envelope" compact />
      <div class="flex gap-2">
        <NxButton icon="pi pi-megaphone" size="sm" @click="broadcastModalOpen = true">Difusión</NxButton>
        <NxButton icon="pi pi-send" size="sm" variant="outline" @click="composeModalOpen = true">Redactar</NxButton>
      </div>
    </div>

    <section v-if="announcements.length" class="rounded-xl border border-slate-200 bg-white p-4">
      <p class="mb-3 text-sm font-semibold text-slate-800">Difusiones</p>
      <div class="flex flex-col divide-y divide-slate-100">
        <div v-for="item in announcements" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 py-2.5">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-900">
              {{ item.title }}
              <span v-if="!item.active" class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Retirada</span>
            </p>
            <p class="text-xs text-slate-500">
              {{ item.created_at ? formatDate(item.created_at) : '' }} · {{ SCOPE_LABEL[item.business_scope] ?? item.business_scope }}
              · {{ item.seen_count ?? 0 }} la vieron
              <template v-if="item.whatsapp_requested">
                · WhatsApp: {{ item.whatsapp_sent }} enviados<template v-if="item.whatsapp_failed">, {{ item.whatsapp_failed }} sin enviar</template>
              </template>
            </p>
          </div>
          <NxButton size="sm" variant="outline" :loading="toggleMutation.isPending.value" @click="toggleMutation.mutate(item)">
            {{ item.active ? 'Retirar del POS' : 'Volver a mostrar' }}
          </NxButton>
        </div>
      </div>
    </section>

    <div class="flex flex-col gap-2 sm:flex-row">
      <NxSelect v-model="channel" label="Canal" size="lg" :options="channelOptions" option-label="label" option-value="value" class="sm:w-56" />
      <NxSelect
        :model-value="businessId"
        label="Negocio"
        size="lg"
        :options="businessOptions"
        option-label="name"
        option-value="id"
        filter
        class="flex-1"
        @update:model-value="businessId = $event as number | null"
        @filter="businessSearch = $event"
      />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="communicationsQuery.data.value?.data ?? []"
        :loading="communicationsQuery.isPending.value"
        paginator
        lazy
        :rows="30"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 30"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">No encontramos comunicaciones con esos criterios.</p>
        </template>
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: CommunicationLogEntry }">
            <span class="whitespace-nowrap text-xs text-slate-500">{{ formatDate(data.created_at) }}</span>
          </template>
        </NxColumn>
        <NxColumn header="Canal">
          <template #body="{ data }: { data: CommunicationLogEntry }">
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="channelBadge[data.channel].class">
              {{ channelBadge[data.channel].label }}
            </span>
          </template>
        </NxColumn>
        <NxColumn header="Negocio">
          <template #body="{ data }: { data: CommunicationLogEntry }">
            {{ data.business_name ?? '—' }}
          </template>
        </NxColumn>
        <NxColumn header="Tipo">
          <template #body="{ data }: { data: CommunicationLogEntry }">
            {{ data.type }}
          </template>
        </NxColumn>
        <NxColumn header="Destinatario">
          <template #body="{ data }: { data: CommunicationLogEntry }">
            <div class="min-w-0">
              <p class="truncate">{{ data.recipient }}</p>
              <p v-if="data.subject" class="truncate text-xs text-slate-400">{{ data.subject }}</p>
            </div>
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: CommunicationLogEntry }">
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadge[data.status].class">
              {{ statusBadge[data.status].label }}
            </span>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <SendCommunicationModal v-model="composeModalOpen" />
    <BroadcastModal v-model="broadcastModalOpen" />
  </div>
</template>
