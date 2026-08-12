import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type {
  ServiceWorkflowPayload,
  ServiceWorkflowStagePayload,
  SuperAdminServiceWorkflow,
} from '@/types/superadmin/serviceWorkflow'

export async function fetchServiceWorkflows(): Promise<SuperAdminServiceWorkflow[]> {
  const { data } = await httpClient.get<SuperAdminServiceWorkflow[]>('/superadmin/service-workflows')
  return data
}

export async function fetchServiceWorkflow(id: number): Promise<SuperAdminServiceWorkflow> {
  const { data } = await httpClient.get<SuperAdminServiceWorkflow>(`/superadmin/service-workflows/${id}`)
  return data
}

export async function createServiceWorkflow(payload: ServiceWorkflowPayload): Promise<SuperAdminServiceWorkflow> {
  const { data } = await httpClient.post<SuperAdminServiceWorkflow>('/superadmin/service-workflows', payload)
  return data
}

export async function updateServiceWorkflow(id: number, payload: ServiceWorkflowPayload): Promise<SuperAdminServiceWorkflow> {
  const { data } = await httpClient.put<SuperAdminServiceWorkflow>(`/superadmin/service-workflows/${id}`, payload)
  return data
}

export async function deleteServiceWorkflow(id: number): Promise<void> {
  await httpClient.delete(`/superadmin/service-workflows/${id}`)
}

export async function createServiceWorkflowStage(
  workflowId: number,
  payload: ServiceWorkflowStagePayload,
): Promise<SuperAdminServiceWorkflow> {
  const { data } = await httpClient.post<SuperAdminServiceWorkflow>(`/superadmin/service-workflows/${workflowId}/stages`, payload)
  return data
}

export async function updateServiceWorkflowStage(
  workflowId: number,
  stageId: number,
  payload: ServiceWorkflowStagePayload,
): Promise<SuperAdminServiceWorkflow> {
  const { data } = await httpClient.put<SuperAdminServiceWorkflow>(
    `/superadmin/service-workflows/${workflowId}/stages/${stageId}`,
    payload,
  )
  return data
}

export async function deleteServiceWorkflowStage(workflowId: number, stageId: number): Promise<SuperAdminServiceWorkflow> {
  const { data } = await httpClient.delete<SuperAdminServiceWorkflow>(
    `/superadmin/service-workflows/${workflowId}/stages/${stageId}`,
  )
  return data
}

export async function reorderServiceWorkflowStages(workflowId: number, ids: number[]): Promise<SuperAdminServiceWorkflow> {
  const { data } = await httpClient.patch<SuperAdminServiceWorkflow>(
    `/superadmin/service-workflows/${workflowId}/stages/reorder`,
    { ids },
  )
  return data
}

export async function assignServiceWorkflowBusiness(workflowId: number, businessId: number): Promise<void> {
  await httpClient.post(`/superadmin/service-workflows/${workflowId}/businesses/${businessId}`)
}

export async function unassignServiceWorkflowBusiness(workflowId: number, businessId: number): Promise<void> {
  await httpClient.delete(`/superadmin/service-workflows/${workflowId}/businesses/${businessId}`)
}

export interface SuperAdminBusinessOption {
  id: number
  name: string
}

export async function searchBusinesses(search: string): Promise<SuperAdminBusinessOption[]> {
  const { data } = await httpClient.get<PaginatedResponse<SuperAdminBusinessOption>>('/superadmin/businesses', {
    params: { search },
  })
  return data.data
}
