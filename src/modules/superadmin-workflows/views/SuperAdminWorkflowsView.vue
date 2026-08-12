<script setup lang="ts">
// Listado de plantillas de workflow - puerto de SuperAdmin/ServiceWorkflows/Index.vue
// del legacy. index() no esta paginado en el backend (lista corta, plantillas
// globales administradas a mano), asi que se muestra completa sin paginador.
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SuperAdminServiceWorkflow } from '@/types/superadmin/serviceWorkflow'
import { NxButton, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import ServiceWorkflowFormModal from '../components/ServiceWorkflowFormModal.vue'
import { useServiceWorkflowMutations } from '../composables/useServiceWorkflowMutations'
import { useServiceWorkflows } from '../composables/useServiceWorkflows'

const router = useRouter()
const workflowsQuery = useServiceWorkflows()
const { deleteMutation } = useServiceWorkflowMutations()
const { notify } = useSystemAlert()

const formModalOpen = ref(false)

function openCreate(): void {
  formModalOpen.value = true
}

function openShow(workflow: SuperAdminServiceWorkflow): void {
  router.push({ name: 'superadmin.workflows.show', params: { id: workflow.id } })
}

async function removeWorkflow(workflow: SuperAdminServiceWorkflow): Promise<void> {
  if (!window.confirm(`¿Eliminar el workflow "${workflow.name}"? Los negocios que lo tengan asignado quedarán sin workflow.`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(workflow.id)
    notify('Workflow eliminado')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el workflow.'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Workflows de servicio" icon="pi pi-sitemap" compact />
      <NxButton icon="pi pi-plus" @click="openCreate">Nuevo workflow</NxButton>
    </div>

    <p class="text-sm text-slate-500">
      Plantillas de etapas para órdenes de servicio (ej. "Recibido → En reparación → Listo"). Un negocio usa como mucho una a
      la vez.
    </p>

    <div v-if="workflowsQuery.isPending.value" class="h-40 animate-pulse rounded-xl bg-slate-100" />

    <div v-else-if="!workflowsQuery.data.value?.length" class="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
      Todavía no hay workflows creados.
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[560px] text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 text-left">Nombre</th>
            <th class="px-4 py-3 text-right">Etapas</th>
            <th class="px-4 py-3 text-right">Negocios</th>
            <th class="px-4 py-3 text-right w-24"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="workflow in workflowsQuery.data.value"
            :key="workflow.id"
            class="cursor-pointer hover:bg-slate-50"
            @click="openShow(workflow)"
          >
            <td class="px-4 py-3">
              <p class="font-semibold text-slate-900">{{ workflow.name }}</p>
              <p v-if="workflow.description" class="text-xs text-slate-400">{{ workflow.description }}</p>
            </td>
            <td class="px-4 py-3 text-right text-slate-600">{{ workflow.stages_count ?? 0 }}</td>
            <td class="px-4 py-3 text-right text-slate-600">{{ workflow.businesses_count ?? 0 }}</td>
            <td class="px-4 py-3 text-right" @click.stop>
              <button
                type="button"
                class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Eliminar"
                @click="removeWorkflow(workflow)"
              >
                <i class="pi pi-trash" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ServiceWorkflowFormModal v-model="formModalOpen" :workflow="null" @saved="openShow" />
  </div>
</template>
