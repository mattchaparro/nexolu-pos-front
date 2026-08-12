// Refleja ServiceWorkflowResource/ServiceWorkflowStageResource
// (app/Http/Resources/Api/V1) en nexolu-pos-api - la version que consume un
// negocio (GET /service-workflow), sin el campo `actions` interno que solo
// necesita el panel de super admin que administra las plantillas.
export interface ServiceWorkflowStage {
  id: number
  workflow_id: number
  label: string
  color: string
  sort_order: number
  is_initial: boolean
}

export interface ServiceWorkflow {
  id: number
  name: string
  description: string | null
  stages: ServiceWorkflowStage[]
}
