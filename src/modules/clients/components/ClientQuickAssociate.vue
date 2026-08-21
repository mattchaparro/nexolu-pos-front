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
import { NxSelect } from '@/ui'
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

const mode = ref<'closed' | 'search'>('closed')
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

const quickCreateError = ref<string | null>(null)
const isCreating = ref(false)

// Antes esto abria un segundo mini-formulario (Nombre/Telefono/Cedula) que
// duplicaba los campos que el usuario ya tiene tipeados arriba (ver
// CustomerFieldsSection/PaymentModal, que pasan name/phone/identification
// como props) - reescribir el mismo dato dos veces no tenia sentido. Ahora
// "Guardar como cliente nuevo" guarda directo con lo que ya esta en el
// formulario principal.
async function quickCreate(): Promise<void> {
  if (!props.name.trim()) {
    return
  }
  isCreating.value = true
  quickCreateError.value = null
  try {
    const client = await createClient({
      name: props.name.trim(),
      phone: props.phone.trim() || null,
      identification: props.identification?.trim() || null,
    })
    notify('Cliente guardado')
    emit('apply', client)
  } catch (error) {
    quickCreateError.value = extractErrorMessage(error, 'No pudimos guardar el cliente.')
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div v-if="clientsFeatureEnabled" class="flex flex-col gap-2 text-xs">
    <p v-if="quickCreateError" class="text-red-600">{{ quickCreateError }}</p>

    <div v-if="mode === 'closed'" class="flex flex-wrap items-center gap-3">
      <button type="button" class="font-semibold text-indigo-600 hover:text-indigo-800" @click="mode = 'search'">
        Asociar con un cliente
      </button>
      <button
        v-if="name.trim()"
        type="button"
        class="font-semibold text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-400"
        :disabled="isCreating"
        @click="quickCreate"
      >
        {{ isCreating ? 'Guardando…' : 'Guardar como cliente nuevo' }}
      </button>
    </div>

    <div v-else class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
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
  </div>
</template>
