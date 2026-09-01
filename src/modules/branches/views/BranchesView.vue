<script setup lang="ts">
// Sedes del negocio. Solo existe con multisede encendida (ver el guard de
// la ruta) - un negocio de una sola sede no tiene nada que administrar aca.
//
// No hay "eliminar": una sede tiene ventas, cajas e inventario colgando y
// borrarla se llevaria la historia del negocio. Se desactiva, que es lo que
// el usuario quiere decir con "cerramos ese punto".
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Branch } from '@/types/branch'
import { NxButton, NxCard, NxColumn, NxDataTable, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import BranchFormModal from '../components/BranchFormModal.vue'
import { useBranchMutations } from '../composables/useBranchMutations'
import { useManagedBranches } from '../composables/useManagedBranches'

const { query, branches } = useManagedBranches()
const { data: business } = useBusiness()
const { deactivateMutation, updateMutation } = useBranchMutations()
const { notify } = useSystemAlert()

const businessInvoicePrefix = computed(() => business.value?.invoice_prefix ?? 'FAC')

const formModalOpen = ref(false)
const editingBranch = ref<Branch | null>(null)

function openNew(): void {
  editingBranch.value = null
  formModalOpen.value = true
}

function openEdit(branch: Branch): void {
  editingBranch.value = branch
  formModalOpen.value = true
}

async function deactivate(branch: Branch): Promise<void> {
  if (!window.confirm(`¿Desactivar "${branch.name}"? Dejará de aparecer para vender y abrir caja.`)) {
    return
  }

  try {
    await deactivateMutation.mutateAsync(branch.id)
    notify('Sede desactivada.', 'success')
  } catch (error) {
    // El backend rechaza desactivar la principal o una con la caja abierta,
    // y su mensaje explica cual de las dos - repetirlo aqui lo desincronizaria.
    notify(extractErrorMessage(error, 'No pudimos desactivar la sede.'), 'error')
  }
}

async function reactivate(branch: Branch): Promise<void> {
  try {
    await updateMutation.mutateAsync({ id: branch.id, payload: { name: branch.name, is_active: true } })
    notify('Sede reactivada.', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos reactivar la sede.'), 'error')
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NxPageHeader
        title="Sedes"
        subtitle="Cada sede lleva su propio inventario, caja y numeración de facturas."
        icon="pi pi-map-marker"
      />
      <NxButton icon="pi pi-plus" @click="openNew">Nueva sede</NxButton>
    </div>

    <NxCard>
      <NxDataTable :value="branches" :loading="query.isLoading.value" data-key="id">
        <NxColumn field="name" header="Sede">
          <template #body="{ data }: { data: Branch }">
            <div class="flex items-center gap-2">
              <span class="font-medium text-slate-800">{{ data.name }}</span>
              <span
                v-if="data.is_main"
                class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
              >
                Principal
              </span>
              <span
                v-if="!data.is_active"
                class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
              >
                Inactiva
              </span>
            </div>
            <p v-if="data.address" class="text-xs text-slate-500">{{ data.address }}</p>
          </template>
        </NxColumn>

        <NxColumn field="code" header="Código">
          <template #body="{ data }: { data: Branch }">
            <span class="text-slate-600">{{ data.code ?? '—' }}</span>
          </template>
        </NxColumn>

        <NxColumn field="invoice_prefix" header="Facturas">
          <template #body="{ data }: { data: Branch }">
            <span class="font-mono text-sm text-slate-600">{{ data.invoice_prefix }}-000001</span>
          </template>
        </NxColumn>

        <NxColumn header="" class="w-40">
          <template #body="{ data }: { data: Branch }">
            <div class="flex justify-end gap-1">
              <NxButton variant="secondary" size="sm" icon="pi pi-pencil" @click="openEdit(data)" />
              <NxButton
                v-if="data.is_active && !data.is_main"
                variant="secondary"
                size="sm"
                icon="pi pi-ban"
                title="Desactivar"
                @click="deactivate(data)"
              />
              <NxButton
                v-if="!data.is_active"
                variant="secondary"
                size="sm"
                icon="pi pi-check"
                title="Reactivar"
                @click="reactivate(data)"
              />
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </NxCard>

    <BranchFormModal
      v-model="formModalOpen"
      :branch="editingBranch"
      :business-invoice-prefix="businessInvoicePrefix"
    />
  </div>
</template>
