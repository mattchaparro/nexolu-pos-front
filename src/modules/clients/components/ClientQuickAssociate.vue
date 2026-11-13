<script setup lang="ts">
// Mientras se escribe el nombre (o el teléfono) del cliente, sugiere los que
// ya existen con su celular para confirmar que es la misma persona; tocar uno
// lo vincula. Si no se escoge ninguno, no hay que hacer nada: al guardar la
// venta con nombre y teléfono, el API crea la ficha sola
// (ClientDirectoryService::resolveForSale). Un cliente es un cliente sin
// importar por dónde entra (venta, cita, apartado).
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { ClientSearchResult } from '@/types/client'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { hasFeature } from '@/utils/hasFeature'

import { useClientSearch } from '../composables/useClientSearch'
import { createClient } from '../services/clientService'

const props = defineProps<{
  name: string
  phone: string
  identification?: string
  /**
   * El API crea la ficha al guardar (ventas y cuentas). Donde no (apartados,
   * citas), se ofrece guardarla aquí.
   */
  autoCreates?: boolean
}>()

const emit = defineEmits<{ apply: [client: ClientSearchResult] }>()

const { data: business } = useBusiness()
const clientsFeatureEnabled = computed(() => hasFeature(business.value, 'clients'))

// El cliente que se acaba de escoger: mientras nombre y teléfono sigan
// siendo los suyos, se muestra como vinculado en vez de volver a sugerirlo.
const applied = ref<ClientSearchResult | null>(null)
const isApplied = computed(
  () =>
    applied.value !== null &&
    applied.value.name === props.name &&
    (applied.value.phone ?? '') === props.phone,
)
watch(isApplied, (value) => {
  if (!value) {
    applied.value = null
  }
})

const digits = computed(() => props.phone.replace(/\D/g, ''))
// Con el celular completo se busca por él (es lo que identifica a alguien, y
// al guardar el API reusa la ficha de ese número); mientras tanto, por nombre.
const term = computed(() => {
  if (digits.value.length >= 7) {
    return digits.value
  }
  if (props.name.trim().length >= 2) {
    return props.name.trim()
  }
  return digits.value.length >= 4 ? digits.value : ''
})

const searchEnabled = computed(() => clientsFeatureEnabled.value && term.value !== '' && !isApplied.value)
const clientsQuery = useClientSearch(term, searchEnabled)
const suggestions = computed(() => (searchEnabled.value ? (clientsQuery.data.value ?? []).slice(0, 4) : []))

function pick(client: ClientSearchResult): void {
  applied.value = client
  emit('apply', client)
}

const { notify } = useSystemAlert()
const isCreating = ref(false)
const createError = ref<string | null>(null)

async function createNow(): Promise<void> {
  isCreating.value = true
  createError.value = null
  try {
    const client = await createClient({
      name: props.name.trim(),
      phone: props.phone.trim() || null,
      identification: props.identification?.trim() || null,
    })
    notify('Cliente guardado')
    pick(client)
  } catch (error) {
    createError.value = extractErrorMessage(error, 'No pudimos guardar el cliente.')
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div v-if="clientsFeatureEnabled" class="text-xs">
    <p v-if="isApplied && applied" class="flex items-center gap-1.5 text-emerald-700">
      <i class="pi pi-check-circle" />
      Cliente registrado: <span class="font-semibold">{{ applied.name }}</span>
      <template v-if="applied.phone"> · {{ applied.phone }}</template>
    </p>

    <div v-else-if="suggestions.length > 0" class="flex flex-col gap-1.5">
      <span class="text-slate-500">¿Es alguno de estos clientes?</span>
      <button
        v-for="client in suggestions"
        :key="client.id"
        type="button"
        class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50"
        @click="pick(client)"
      >
        <span class="min-w-0 truncate font-medium text-slate-800">{{ client.name }}</span>
        <span class="shrink-0 text-xs text-slate-500">{{ client.phone || 'Sin teléfono' }}</span>
      </button>
    </div>

    <template v-else-if="name.trim()">
      <p v-if="autoCreates && digits.length >= 7" class="text-slate-500">
        <i class="pi pi-user-plus mr-1" />Cliente nuevo: se guarda al registrar la venta.
      </p>
      <button
        v-else-if="!autoCreates"
        type="button"
        class="font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
        :disabled="isCreating"
        @click="createNow"
      >
        {{ isCreating ? 'Guardando…' : 'Guardar como cliente nuevo' }}
      </button>
      <p v-if="createError" class="mt-1 text-red-600">{{ createError }}</p>
    </template>
  </div>
</template>
