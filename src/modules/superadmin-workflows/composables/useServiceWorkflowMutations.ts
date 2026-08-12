import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { ServiceWorkflowPayload, ServiceWorkflowStagePayload } from '@/types/superadmin/serviceWorkflow'

import {
  assignServiceWorkflowBusiness,
  createServiceWorkflow,
  createServiceWorkflowStage,
  deleteServiceWorkflow,
  deleteServiceWorkflowStage,
  reorderServiceWorkflowStages,
  unassignServiceWorkflowBusiness,
  updateServiceWorkflow,
  updateServiceWorkflowStage,
} from '../services/serviceWorkflowService'

export function useServiceWorkflowMutations() {
  const queryClient = useQueryClient()

  const invalidate = (workflowId?: number) => {
    queryClient.invalidateQueries({ queryKey: ['superadmin', 'service-workflows'] })
    if (workflowId) {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'service-workflows', workflowId] })
    }
  }

  const createMutation = useMutation({
    mutationFn: createServiceWorkflow,
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: ServiceWorkflowPayload }) => updateServiceWorkflow(params.id, params.payload),
    onSuccess: (_, params) => invalidate(params.id),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteServiceWorkflow,
    onSuccess: () => invalidate(),
  })

  const createStageMutation = useMutation({
    mutationFn: (params: { workflowId: number; payload: ServiceWorkflowStagePayload }) =>
      createServiceWorkflowStage(params.workflowId, params.payload),
    onSuccess: (_, params) => invalidate(params.workflowId),
  })

  const updateStageMutation = useMutation({
    mutationFn: (params: { workflowId: number; stageId: number; payload: ServiceWorkflowStagePayload }) =>
      updateServiceWorkflowStage(params.workflowId, params.stageId, params.payload),
    onSuccess: (_, params) => invalidate(params.workflowId),
  })

  const deleteStageMutation = useMutation({
    mutationFn: (params: { workflowId: number; stageId: number }) => deleteServiceWorkflowStage(params.workflowId, params.stageId),
    onSuccess: (_, params) => invalidate(params.workflowId),
  })

  const reorderStagesMutation = useMutation({
    mutationFn: (params: { workflowId: number; ids: number[] }) => reorderServiceWorkflowStages(params.workflowId, params.ids),
    onSuccess: (_, params) => invalidate(params.workflowId),
  })

  const assignBusinessMutation = useMutation({
    mutationFn: (params: { workflowId: number; businessId: number }) =>
      assignServiceWorkflowBusiness(params.workflowId, params.businessId),
    onSuccess: (_, params) => invalidate(params.workflowId),
  })

  const unassignBusinessMutation = useMutation({
    mutationFn: (params: { workflowId: number; businessId: number }) =>
      unassignServiceWorkflowBusiness(params.workflowId, params.businessId),
    onSuccess: (_, params) => invalidate(params.workflowId),
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    createStageMutation,
    updateStageMutation,
    deleteStageMutation,
    reorderStagesMutation,
    assignBusinessMutation,
    unassignBusinessMutation,
  }
}
