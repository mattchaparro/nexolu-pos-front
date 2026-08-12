<script setup lang="ts">
// Proveedores - CRUD + recordatorio de visita. Puerto de
// Admin/Suppliers/Index.vue del legacy (tabla + modal de recordar visita +
// confirmacion de eliminar), con el DataTable ya establecido en Catalogo
// en vez de una tabla armada a mano.
import { computed, ref, watch } from 'vue'

import type { Supplier } from '@/types/supplier'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import CatalogHubTabs from '../../catalog/components/CatalogHubTabs.vue'
import RemindVisitModal from '../components/RemindVisitModal.vue'
import SupplierFormModal from '../components/SupplierFormModal.vue'
import { useSupplierMutations } from '../composables/useSupplierMutations'
import { useSuppliers } from '../composables/useSuppliers'

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

const suppliersQuery = useSuppliers(search, page)
const meta = computed(() => suppliersQuery.data.value?.meta)
const { deleteMutation } = useSupplierMutations()

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const formModalOpen = ref(false)
const editingSupplier = ref<Supplier | null>(null)

function openNewSupplier(): void {
  editingSupplier.value = null
  formModalOpen.value = true
}

function openEditSupplier(supplier: Supplier): void {
  editingSupplier.value = supplier
  formModalOpen.value = true
}

const remindModalOpen = ref(false)
const remindingSupplier = ref<Supplier | null>(null)

function openRemindVisit(supplier: Supplier): void {
  remindingSupplier.value = supplier
  remindModalOpen.value = true
}

async function removeSupplier(supplier: Supplier): Promise<void> {
  if (!window.confirm(`¿Eliminar "${supplier.name}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(supplier.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el proveedor.'))
  }
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Proveedores" icon="pi pi-truck" compact />
      <NxButton icon="pi pi-plus" @click="openNewSupplier">Proveedor</NxButton>
    </div>

    <CatalogHubTabs />

    <NxInput v-model="searchInput" label="Buscar por nombre, NIT o teléfono" size="lg" icon="pi pi-search" clearable blur-after-typing />

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="suppliersQuery.data.value?.data ?? []"
        :loading="suppliersQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">
            {{ search ? 'Sin resultados para tu búsqueda.' : 'Todavía no hay proveedores.' }}
          </p>
        </template>
        <NxColumn header="Nombre">
          <template #body="{ data }: { data: Supplier }">
            <p class="text-sm font-semibold text-slate-900">
              {{ data.name }}
              <span
                v-if="data.next_visit_reminder_due_date"
                class="ml-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600"
              >
                <i class="pi pi-calendar text-[10px]" />
                {{ formatDate(data.next_visit_reminder_due_date) }}
              </span>
            </p>
          </template>
        </NxColumn>
        <NxColumn header="NIT / Doc.">
          <template #body="{ data }: { data: Supplier }">
            {{ data.tax_id || '—' }}
          </template>
        </NxColumn>
        <NxColumn header="Teléfono">
          <template #body="{ data }: { data: Supplier }">
            {{ data.phone || '—' }}
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: Supplier }">
            <div class="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
              <button
                type="button"
                class="text-slate-400 hover:text-indigo-600"
                title="Recordar visita"
                @click="openRemindVisit(data)"
              >
                <i class="pi pi-calendar-plus text-sm" />
              </button>
              <button
                type="button"
                class="text-slate-400 hover:text-indigo-600"
                title="Editar"
                @click="openEditSupplier(data)"
              >
                <i class="pi pi-pencil text-sm" />
              </button>
              <button
                type="button"
                class="text-slate-300 hover:text-red-500"
                title="Eliminar"
                :disabled="deleteMutation.isPending.value"
                @click="removeSupplier(data)"
              >
                <i class="pi pi-trash text-sm" />
              </button>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <SupplierFormModal v-model="formModalOpen" :supplier="editingSupplier" />
    <RemindVisitModal v-model="remindModalOpen" :supplier="remindingSupplier" />
  </div>
</template>
