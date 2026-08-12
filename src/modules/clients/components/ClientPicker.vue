<script setup lang="ts">
// Selector de cliente (opcional) con busqueda server-side (via
// NxSelect filter+@filter, ver src/ui/NxSelect.vue) y alta rapida inline -
// no existe todavia una pantalla de gestion de Clientes, asi que el alta
// se limita a lo minimo que exige StoreClientRequest (nombre + telefono
// opcional), sin duplicar un CRUD completo que nadie pidio todavia.
import { ref } from 'vue'

import { usePermissions } from '@/composables/usePermissions'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useClientSearch } from '../composables/useClientSearch'
import { createClient } from '../services/clientService'

defineProps<{
  modelValue: number | null
  error?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const search = ref('')
const clientsQuery = useClientSearch(search)
const { notify } = useSystemAlert()
// GET /clients/search y POST /clients requieren clients.manage (ver
// routes/api.php) - un empleado sin ese permiso puede igual gestionar la
// orden/cita (permission distinto, appointments.manage) pero no puede
// buscar ni crear clientes desde aca.
const { hasPermission } = usePermissions()
const canManageClients = hasPermission('clients.manage')

const showQuickCreate = ref(false)
const quickName = ref('')
const quickPhone = ref('')
const quickCreateError = ref<string | null>(null)
const isCreating = ref(false)

async function quickCreate(): Promise<void> {
  if (!quickName.value.trim()) {
    return
  }
  isCreating.value = true
  quickCreateError.value = null
  try {
    const client = await createClient({ name: quickName.value.trim(), phone: quickPhone.value.trim() || null })
    notify('Cliente creado')
    emit('update:modelValue', client.id)
    showQuickCreate.value = false
    quickName.value = ''
    quickPhone.value = ''
  } catch (error) {
    quickCreateError.value = extractErrorMessage(error, 'No pudimos crear el cliente.')
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <NxSelect
      :model-value="modelValue"
      :options="clientsQuery.data.value ?? []"
      option-label="name"
      option-value="id"
      label="Cliente (opcional)"
      filter
      :error="error"
      @update:model-value="emit('update:modelValue', $event as number | null)"
      @filter="search = $event"
    />
    <button
      v-if="canManageClients"
      type="button"
      class="self-start text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      @click="showQuickCreate = !showQuickCreate"
    >
      {{ showQuickCreate ? 'Cancelar' : '+ Nuevo cliente' }}
    </button>
    <div v-if="canManageClients && showQuickCreate" class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p v-if="quickCreateError" class="text-xs text-red-600">{{ quickCreateError }}</p>
      <NxInput v-model="quickName" label="Nombre" size="sm" />
      <NxInput v-model="quickPhone" label="Teléfono (opcional)" size="sm" />
      <NxButton size="sm" :loading="isCreating" @click="quickCreate">Crear y seleccionar</NxButton>
    </div>
  </div>
</template>
