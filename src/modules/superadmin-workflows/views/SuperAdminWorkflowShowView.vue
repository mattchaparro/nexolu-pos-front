<script setup lang="ts">
// Detalle de un workflow - editar nombre/descripcion, administrar etapas
// (crear/editar/eliminar/reordenar) y asignar/quitar negocios. Puerto
// simplificado de SuperAdmin/ServiceWorkflows/Show.vue del legacy (el
// reordenar-arrastrando de alli se resuelve aca con botones arriba/abajo -
// no hay una primitiva de drag&drop en Nexolu UI todavia y una plantilla
// de workflow tipicamente tiene pocas etapas, no vale la pena traer una
// libreria solo para esto).
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import StageBadge from '@/components/StageBadge.vue'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SuperAdminServiceWorkflowStage } from '@/types/superadmin/serviceWorkflow'
import { NxButton, NxPageHeader, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import ServiceWorkflowFormModal from '../components/ServiceWorkflowFormModal.vue'
import ServiceWorkflowStageFormModal from '../components/ServiceWorkflowStageFormModal.vue'
import { useBusinessSearch } from '../composables/useBusinessSearch'
import { useServiceWorkflow } from '../composables/useServiceWorkflow'
import { useServiceWorkflowMutations } from '../composables/useServiceWorkflowMutations'

const route = useRoute()
const router = useRouter()
const { notify } = useSystemAlert()

const workflowId = computed(() => (route.params.id ? Number(route.params.id) : null))
const workflowQuery = useServiceWorkflow(workflowId)
const workflow = computed(() => workflowQuery.data.value ?? null)

const { deleteStageMutation, reorderStagesMutation, assignBusinessMutation, unassignBusinessMutation } =
  useServiceWorkflowMutations()

const editModalOpen = ref(false)
const stageModalOpen = ref(false)
const editingStage = ref<SuperAdminServiceWorkflowStage | null>(null)
const actionError = ref<string | null>(null)

function openNewStage(): void {
  editingStage.value = null
  stageModalOpen.value = true
}

function openEditStage(stage: SuperAdminServiceWorkflowStage): void {
  editingStage.value = stage
  stageModalOpen.value = true
}

async function removeStage(stage: SuperAdminServiceWorkflowStage): Promise<void> {
  if (!workflow.value || !window.confirm(`¿Eliminar la etapa "${stage.label}"?`)) {
    return
  }
  try {
    await deleteStageMutation.mutateAsync({ workflowId: workflow.value.id, stageId: stage.id })
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar la etapa.'))
  }
}

async function moveStage(stage: SuperAdminServiceWorkflowStage, direction: -1 | 1): Promise<void> {
  if (!workflow.value) {
    return
  }
  const stages = [...workflow.value.stages].sort((a, b) => a.sort_order - b.sort_order)
  const index = stages.findIndex((s) => s.id === stage.id)
  const swapWith = index + direction
  if (swapWith < 0 || swapWith >= stages.length) {
    return
  }
  ;[stages[index], stages[swapWith]] = [stages[swapWith], stages[index]]

  try {
    await reorderStagesMutation.mutateAsync({ workflowId: workflow.value.id, ids: stages.map((s) => s.id) })
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos reordenar las etapas.'))
  }
}

const businessSearch = ref('')
const businessSearchQuery = useBusinessSearch(businessSearch)

async function assignBusiness(businessId: number | null): Promise<void> {
  if (!workflow.value || businessId === null) {
    return
  }
  actionError.value = null
  try {
    await assignBusinessMutation.mutateAsync({ workflowId: workflow.value.id, businessId })
    notify('Negocio asignado')
    businessSearch.value = ''
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos asignar el negocio.')
  }
}

async function unassignBusiness(businessId: number): Promise<void> {
  if (!workflow.value) {
    return
  }
  actionError.value = null
  try {
    await unassignBusinessMutation.mutateAsync({ workflowId: workflow.value.id, businessId })
    notify('Negocio desasignado')
  } catch (error) {
    actionError.value = extractErrorMessage(error, 'No pudimos quitar el negocio.')
  }
}

function actionLabel(stage: SuperAdminServiceWorkflowStage): string {
  const actions = stage.actions ?? []
  const labels = []
  if (actions.some((a) => a.type === 'mark_order_paid')) {
    labels.push('Marca como pagada')
  }
  if (actions.some((a) => a.type === 'trigger_on_payment_complete')) {
    labels.push('Destino al pagar')
  }
  return labels.join(' · ')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="router.push({ name: 'superadmin.workflows.index' })">
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="workflow ? workflow.name : 'Workflow'" icon="pi pi-sitemap" compact />
    </div>

    <template v-if="workflowQuery.isPending.value">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <template v-else-if="workflow">
      <p v-if="actionError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ actionError }}</p>

      <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p v-if="workflow.description" class="text-slate-600">{{ workflow.description }}</p>
        <p v-else class="text-slate-400 italic">Sin descripción.</p>
        <NxButton size="sm" variant="outline" class="self-start" @click="editModalOpen = true">Editar nombre/descripción</NxButton>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p class="text-sm font-semibold text-slate-700">Etapas</p>
          <NxButton size="sm" icon="pi pi-plus" @click="openNewStage">Nueva etapa</NxButton>
        </div>
        <p v-if="!workflow.stages.length" class="px-4 py-6 text-center text-sm text-slate-400">Todavía no hay etapas.</p>
        <ul v-else class="divide-y divide-slate-100">
          <li
            v-for="(stage, index) in [...workflow.stages].sort((a, b) => a.sort_order - b.sort_order)"
            :key="stage.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <div class="flex flex-col">
              <button
                type="button"
                class="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                :disabled="index === 0"
                @click="moveStage(stage, -1)"
              >
                <i class="pi pi-chevron-up text-xs" />
              </button>
              <button
                type="button"
                class="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                :disabled="index === workflow.stages.length - 1"
                @click="moveStage(stage, 1)"
              >
                <i class="pi pi-chevron-down text-xs" />
              </button>
            </div>
            <StageBadge :stage="stage" />
            <span v-if="stage.is_initial" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inicial</span>
            <span v-if="actionLabel(stage)" class="text-xs text-slate-400">{{ actionLabel(stage) }}</span>
            <div class="ml-auto flex items-center gap-2">
              <button type="button" class="text-xs font-medium text-indigo-600 hover:text-indigo-800" @click="openEditStage(stage)">
                Editar
              </button>
              <button type="button" class="text-xs font-medium text-red-600 hover:text-red-800" @click="removeStage(stage)">
                Eliminar
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-4 py-3">
          <p class="text-sm font-semibold text-slate-700">Negocios con este workflow</p>
        </div>
        <ul v-if="workflow.businesses.length" class="divide-y divide-slate-100">
          <li v-for="business in workflow.businesses" :key="business.id" class="flex items-center justify-between px-4 py-3 text-sm">
            <span class="text-slate-700">{{ business.name }}</span>
            <button
              type="button"
              class="text-xs font-medium text-red-600 hover:text-red-800"
              @click="unassignBusiness(business.id)"
            >
              Quitar
            </button>
          </li>
        </ul>
        <p v-else class="px-4 py-6 text-center text-sm text-slate-400">Ningún negocio tiene este workflow asignado.</p>

        <div class="border-t border-slate-100 p-4">
          <NxSelect
            :model-value="null"
            :options="businessSearchQuery.data.value ?? []"
            option-label="name"
            option-value="id"
            label="Buscar negocio para asignar"
            filter
            @update:model-value="assignBusiness($event as number | null)"
            @filter="businessSearch = $event"
          />
        </div>
      </div>
    </template>

    <ServiceWorkflowFormModal v-model="editModalOpen" :workflow="workflow" />
    <ServiceWorkflowStageFormModal
      v-if="workflow"
      v-model="stageModalOpen"
      :workflow-id="workflow.id"
      :stage="editingStage"
    />
  </div>
</template>
