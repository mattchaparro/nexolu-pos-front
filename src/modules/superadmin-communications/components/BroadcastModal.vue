<script setup lang="ts">
// Difusion a los negocios: un aviso que el admin ve al entrar al POS y,
// opcional, un WhatsApp al numero del negocio con la plantilla de novedades.
// Antes de mandar se ve a cuantos negocios llega (y cuantos tienen WhatsApp)
// y como se va a ver.
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxModal, NxSelect, NxSwitch, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useBusinessSearch } from '../composables/useBusinessSearch'
import {
  createAnnouncement,
  fetchAnnouncementAudience,
  type AnnouncementScope,
} from '../services/announcementService'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

// Pantallas a las que puede llevar el boton del aviso (rutas reales del POS).
const ctaOptions = [
  { value: '', label: 'Sin botón', label_text: '' },
  { value: '/asistente-ia', label: 'Asistente de IA', label_text: 'Probar el asistente' },
  { value: '/vender', label: 'Vender', label_text: 'Ir a vender' },
  { value: '/catalogo', label: 'Catálogo', label_text: 'Ver el catálogo' },
  { value: '/tienda-online', label: 'Tienda online', label_text: 'Ver la tienda online' },
  { value: '/reportes', label: 'Reportes', label_text: 'Ver los reportes' },
  { value: '/suscripcion', label: 'Mi suscripción', label_text: 'Ver mi suscripción' },
]

const scopeOptions: Array<{ value: AnnouncementScope; label: string }> = [
  { value: 'in_use', label: 'Negocios en uso (al día o en prueba)' },
  { value: 'active', label: 'Todos los negocios activos' },
  { value: 'selected', label: 'Elegir negocios' },
]

const title = ref('')
const body = ref('')
const ctaUrl = ref('/asistente-ia')
const ctaLabel = ref('Probar el asistente')
const audience = ref<'admin' | 'all'>('admin')
const scope = ref<AnnouncementScope>('in_use')
const selected = ref<Array<{ id: number; name: string }>>([])
const businessSearch = ref('')
const sendWhatsApp = ref(true)
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      title.value = ''
      body.value = ''
      ctaUrl.value = '/asistente-ia'
      ctaLabel.value = 'Probar el asistente'
      audience.value = 'admin'
      scope.value = 'in_use'
      selected.value = []
      sendWhatsApp.value = true
      formError.value = null
    }
  },
)

watch(ctaUrl, (url) => {
  ctaLabel.value = ctaOptions.find((o) => o.value === url)?.label_text ?? ''
})

const businessSearchQuery = useBusinessSearch(businessSearch)
const searchResults = computed(() =>
  (businessSearchQuery.data.value ?? []).filter((b) => !selected.value.some((s) => s.id === b.id)),
)

const selectedIds = computed(() => selected.value.map((b) => b.id))
const audienceQuery = useQuery({
  queryKey: computed(() => ['superadmin', 'announcements', 'audience', scope.value, selectedIds.value] as const),
  queryFn: () => fetchAnnouncementAudience(scope.value, selectedIds.value),
  enabled: computed(() => props.modelValue && (scope.value !== 'selected' || selectedIds.value.length > 0)),
})
const reach = computed(() => audienceQuery.data.value)

const canSend = computed(
  () =>
    title.value.trim() !== '' &&
    body.value.trim() !== '' &&
    (scope.value !== 'selected' || selected.value.length > 0) &&
    (reach.value?.businesses ?? 0) > 0,
)

const { notify } = useSystemAlert()
const queryClient = useQueryClient()
const sendMutation = useMutation({
  mutationFn: () =>
    createAnnouncement({
      title: title.value.trim(),
      body: body.value.trim(),
      cta_url: ctaUrl.value || null,
      cta_label: ctaUrl.value ? ctaLabel.value.trim() || null : null,
      audience: audience.value,
      business_scope: scope.value,
      business_ids: scope.value === 'selected' ? selectedIds.value : undefined,
      send_whatsapp: sendWhatsApp.value,
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['superadmin', 'announcements'] })
    notify(sendWhatsApp.value ? 'Difusión publicada. Los WhatsApp se están enviando.' : 'Difusión publicada.', 'success')
    emit('update:modelValue', false)
  },
  onError: (error) => {
    formError.value = extractErrorMessage(error, 'No pudimos enviar la difusión.')
  },
})

function send(): void {
  formError.value = null
  const who = `${reach.value?.businesses ?? 0} negocio(s)`
  const whatsapp = sendWhatsApp.value ? ` y un WhatsApp a ${reach.value?.with_whatsapp ?? 0}` : ''
  if (window.confirm(`Se publicará el aviso en el POS de ${who}${whatsapp}. ¿Enviar?`)) {
    sendMutation.mutate()
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Nueva difusión" size="lg" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-3">
        <NxInput v-model="title" label="Título" placeholder="El asistente de IA ya responde tus márgenes" />
        <div>
          <NxTextarea v-model="body" label="Mensaje" :rows="4" :maxlength="1000" />
          <p class="mt-1 text-right text-[11px] text-slate-400">{{ body.length }}/1000</p>
        </div>
        <div class="flex flex-col gap-3">
          <NxSelect v-model="ctaUrl" label="Botón del aviso lleva a" :options="ctaOptions" option-label="label" option-value="value" />
          <NxInput v-if="ctaUrl" v-model="ctaLabel" label="Texto del botón" />
        </div>
        <div class="flex flex-col gap-3">
          <NxSelect
            v-model="scope"
            label="A qué negocios"
            :options="scopeOptions"
            option-label="label"
            option-value="value"
          />
          <NxSelect
            v-model="audience"
            label="Quién lo ve en el POS"
            :options="[
              { value: 'admin', label: 'Solo administradores' },
              { value: 'all', label: 'Todos los usuarios' },
            ]"
            option-label="label"
            option-value="value"
          />
        </div>

        <div v-if="scope === 'selected'" class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
          <NxInput v-model="businessSearch" label="Buscar negocio" size="sm" icon="pi pi-search" />
          <div v-if="searchResults.length" class="flex flex-wrap gap-1.5">
            <button
              v-for="business in searchResults.slice(0, 8)"
              :key="business.id"
              type="button"
              class="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
              @click="selected = [...selected, business]"
            >
              + {{ business.name }}
            </button>
          </div>
          <div v-if="selected.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="business in selected"
              :key="business.id"
              class="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
            >
              {{ business.name }}
              <button type="button" class="text-indigo-400 hover:text-indigo-700" @click="selected = selected.filter((s) => s.id !== business.id)">
                <i class="pi pi-times text-[10px]" />
              </button>
            </span>
          </div>
        </div>

        <label class="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
          <NxSwitch v-model="sendWhatsApp" class="mt-0.5" />
          <span class="text-sm text-slate-700">
            <span class="font-semibold">También por WhatsApp</span><br />
            <span class="text-xs text-slate-500">
              Al número de cada negocio, con la plantilla de novedades (título + mensaje y un botón a Nexolú POS).
              Meta la cobra como marketing.
            </span>
          </span>
        </label>
      </div>

      <!-- Como se ve y a cuantos llega -->
      <aside class="flex flex-col gap-3">
        <p class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Así lo verán en el POS</p>
        <div class="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <span class="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <i class="pi pi-megaphone" />
          </span>
          <p class="mt-3 font-semibold text-slate-900">{{ title || 'Título de la novedad' }}</p>
          <p class="mt-1 text-sm whitespace-pre-line text-slate-600">{{ body || 'El mensaje aparece aquí.' }}</p>
          <div class="mt-3 flex justify-end gap-2">
            <span class="rounded-lg px-3 py-1.5 text-xs text-slate-500">Entendido</span>
            <span v-if="ctaUrl" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
              {{ ctaLabel || 'Ver' }}
            </span>
          </div>
        </div>

        <div class="rounded-xl bg-slate-50 p-3 text-sm">
          <p v-if="audienceQuery.isFetching.value" class="text-slate-400">Calculando…</p>
          <template v-else-if="reach">
            <p class="font-semibold text-slate-800">Llega a {{ reach.businesses }} negocio(s)</p>
            <p v-if="sendWhatsApp" class="text-xs text-slate-500">{{ reach.with_whatsapp }} con WhatsApp registrado</p>
            <p class="mt-1 text-[11px] text-slate-400">{{ reach.names.join(', ') }}</p>
          </template>
          <p v-else class="text-slate-400">Elige los negocios.</p>
        </div>
      </aside>
    </div>

    <p v-if="formError" class="mt-3 text-sm text-red-600">{{ formError }}</p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <NxButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton icon="pi pi-megaphone" :disabled="!canSend" :loading="sendMutation.isPending.value" @click="send">
          Enviar difusión
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
