<script setup lang="ts">
// Ofrece asociar el nombre/telefono que se esta escribiendo (venta, cuenta
// abierta, apartado) con un Client existente, o darlo de alta como uno
// nuevo - un cliente es un cliente sin importar por donde entra (venta,
// cita, apartado), asi que no hace falta reescribir esta logica en cada
// modulo (misma busqueda/alta rapida que ClientPicker.vue). Emite el Client
// completo (con id): el padre decide que hacer con el - normalmente
// prellenar nombre/telefono Y guardar el client_id real (ver
// CUSTOMER_ID en CUTOVER_TODO.md #4, ya migrado a sales/layaways/
// receivables).
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxSelect } from '@/ui'
import type { ClientSearchResult } from '@/types/client'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { hasFeature } from '@/utils/hasFeature'

import { useClientSearch } from '../composables/useClientSearch'
import { createClient } from '../services/clientService'

const props = defineProps<{
  name: string
  phone: string
  identification?: string
}>()

const emit = defineEmits<{ apply: [client: ClientSearchResult] }>()

const { data: business } = useBusiness()
const clientsFeatureEnabled = computed(() => hasFeature(business.value, 'clients'))

const { notify } = useSystemAlert()

const mode = ref<'closed' | 'search' | 'create'>('closed')
const search = ref('')
const clientsQuery = useClientSearch(search, clientsFeatureEnabled)

function pickClient(id: number | null): void {
  const client = clientsQuery.data.value?.find((c) => c.id === id)
  if (!client) {
    return
  }
  emit('apply', client)
  mode.value = 'closed'
  search.value = ''
}

const quickName = ref('')
const quickPhone = ref('')
const quickIdentification = ref('')
const quickCreateError = ref<string | null>(null)
const isCreating = ref(false)

function openCreate(): void {
  quickName.value = props.name
  quickPhone.value = props.phone
  quickIdentification.value = props.identification ?? ''
  quickCreateError.value = null
  mode.value = 'create'
}

async function quickCreate(): Promise<void> {
  if (!quickName.value.trim()) {
    return
  }
  isCreating.value = true
  quickCreateError.value = null
  try {
    const client = await createClient({
      name: quickName.value.trim(),
      phone: quickPhone.value.trim() || null,
      identification: quickIdentification.value.trim() || null,
    })
    notify('Cliente guardado')
    emit('apply', client)
    mode.value = 'closed'
  } catch (error) {
    quickCreateError.value = extractErrorMessage(error, 'No pudimos guardar el cliente.')
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div v-if="clientsFeatureEnabled" class="flex flex-col gap-2 text-xs">
    <div v-if="mode === 'closed'" class="flex flex-wrap gap-3">
      <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-800" @click="mode = 'search'">
        Asociar con un cliente
      </button>
      <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-800" @click="openCreate">
        Guardar como cliente nuevo
      </button>
    </div>

    <div v-else-if="mode === 'search'" class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div class="flex items-center justify-between">
        <span class="font-medium text-slate-600">Buscar cliente</span>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="mode = 'closed'">Cancelar</button>
      </div>
      <NxSelect
        :model-value="null"
        :options="clientsQuery.data.value ?? []"
        option-label="name"
        option-value="id"
        filter
        :filter-fields="['name', 'phone', 'email', 'identification']"
        placeholder="Nombre, telefono o cedula"
        @update:model-value="pickClient($event as number | null)"
        @filter="search = $event"
      />
    </div>

    <div v-else class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div class="flex items-center justify-between">
        <span class="font-medium text-slate-600">Nuevo cliente</span>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="mode = 'closed'">Cancelar</button>
      </div>
      <p v-if="quickCreateError" class="text-red-600">{{ quickCreateError }}</p>
      <NxInput v-model="quickName" label="Nombre" size="sm" />
      <NxInput v-model="quickPhone" label="Teléfono (opcional)" size="sm" />
      <NxInput v-model="quickIdentification" label="Cédula (opcional)" size="sm" />
      <NxButton size="sm" :loading="isCreating" @click="quickCreate">Guardar cliente</NxButton>
    </div>
  </div>
</template>
