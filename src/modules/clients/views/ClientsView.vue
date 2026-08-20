<script setup lang="ts">
// Clientes - CRUD basico (listar/buscar/crear/editar/eliminar). Puerto de
// Admin/Clients/Index.vue + Save.vue del legacy. Antes de esto solo
// existia ClientPicker.vue (buscador embebido en otro formulario) sin
// pantalla propia para gestionar/depurar la base de clientes.
import { computed, ref, watch } from 'vue'

import type { Client } from '@/types/client'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import ClientFormModal from '../components/ClientFormModal.vue'
import { useClientMutations } from '../composables/useClientMutations'
import { useClients } from '../composables/useClients'

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

const clientsQuery = useClients(search, page)
const meta = computed(() => clientsQuery.data.value?.meta)
const { deleteMutation } = useClientMutations()

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const formModalOpen = ref(false)
const editingClient = ref<Client | null>(null)

function openNewClient(): void {
  editingClient.value = null
  formModalOpen.value = true
}

function openEditClient(client: Client): void {
  editingClient.value = client
  formModalOpen.value = true
}

async function removeClient(client: Client): Promise<void> {
  if (!window.confirm(`¿Eliminar "${client.name}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(client.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el cliente.'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Clientes" icon="pi pi-users" compact />
      <NxButton icon="pi pi-plus" @click="openNewClient">Cliente</NxButton>
    </div>

    <NxInput
      v-model="searchInput"
      label="Buscar por nombre, teléfono, correo o cédula"
      size="lg"
      icon="pi pi-search"
      clearable
      blur-after-typing
    />

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="clientsQuery.data.value?.data ?? []"
        :loading="clientsQuery.isPending.value"
        paginator
        lazy
        :rows="25"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 25"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">
            {{ search ? 'Sin resultados para tu búsqueda.' : 'Todavía no hay clientes.' }}
          </p>
        </template>
        <NxColumn header="Nombre">
          <template #body="{ data }: { data: Client }">
            <p class="text-sm font-semibold text-slate-900">{{ data.name }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Teléfono">
          <template #body="{ data }: { data: Client }">
            {{ data.phone || '—' }}
          </template>
        </NxColumn>
        <NxColumn header="Cédula">
          <template #body="{ data }: { data: Client }">
            {{ data.identification || '—' }}
          </template>
        </NxColumn>
        <NxColumn header="Correo">
          <template #body="{ data }: { data: Client }">
            {{ data.email || '—' }}
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: Client }">
            <div class="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
              <button type="button" class="text-slate-400 hover:text-indigo-600" title="Editar" @click="openEditClient(data)">
                <i class="pi pi-pencil text-sm" />
              </button>
              <button
                type="button"
                class="text-slate-300 hover:text-red-500"
                title="Eliminar"
                :disabled="deleteMutation.isPending.value"
                @click="removeClient(data)"
              >
                <i class="pi pi-trash text-sm" />
              </button>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <ClientFormModal v-model="formModalOpen" :client="editingClient" />
  </div>
</template>
