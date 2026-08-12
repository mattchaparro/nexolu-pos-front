// Refleja Api\V1\SuperAdmin\ServiceWorkflowResource/ServiceWorkflowStageResource
// (nexolu-pos-api) - version de administracion, con `actions` (a diferencia
// de la version que consume un negocio, ver types/serviceWorkflow.ts).
export type ServiceWorkflowActionType = 'trigger_on_payment_complete' | 'mark_order_paid'

export interface ServiceWorkflowAction {
  type: ServiceWorkflowActionType
}

export interface SuperAdminServiceWorkflowStage {
  id: number
  workflow_id: number
  label: string
  color: string
  sort_order: number
  is_initial: boolean
  actions: ServiceWorkflowAction[] | null
}

export interface SuperAdminServiceWorkflowBusiness {
  id: number
  name: string
}

export interface SuperAdminServiceWorkflow {
  id: number
  name: string
  description: string | null
  stages_count?: number
  businesses_count?: number
  stages: SuperAdminServiceWorkflowStage[]
  businesses: SuperAdminServiceWorkflowBusiness[]
  created_at: string
}

export interface ServiceWorkflowPayload {
  name: string
  description?: string | null
}

export interface ServiceWorkflowStagePayload {
  label: string
  color: string
  is_initial?: boolean
  actions?: ServiceWorkflowAction[]
}
