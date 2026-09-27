// Refleja ServiceOrderResource/ServiceOrderItemResource/ServicePaymentResource
// (app/Http/Resources/Api/V1) en nexolu-pos-api.
import type { Client } from './client'
import type { ServiceWorkflowStage } from './serviceWorkflow'

export type ServiceOrderStatus = 'pending' | 'partial' | 'paid' | 'cancelled'

export interface ServiceOrderItem {
  id: number
  name: string
  quantity: number
  unit_price: number
  subtotal: number
  user_id: number | null
  notes: string | null
}

export interface ServicePayment {
  id: number
  amount: number
  payment_method: string
  notes: string | null
  recorded_by_user_id: number
  created_at: string
}

export interface ServiceOrder {
  id: number
  business_id: number
  client_id: number | null
  /**
   * Cliente como texto de la orden (lo que se escribio al crearla). En las
   * migradas del legacy, que solo tienen ficha, el backend ya lo rellena
   * con client.name/phone/email - usar estos, no client.
   */
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  appointment_id: number | null
  product_id: number | null
  user_id: number
  stage_id: number | null
  service_name: string
  total: number
  amount_paid: number
  balance: number
  status: ServiceOrderStatus
  status_label: string
  notes: string | null
  paid_at: string | null
  items: ServiceOrderItem[]
  payments: ServicePayment[]
  // whenLoaded en un objeto sin client_id serializa como recurso con todos
  // los campos en null, no como JSON null - comprobar client?.id != null.
  client: Partial<Client> | null
  // Solo tiene valor si el negocio tiene un ServiceWorkflow asignado (ver
  // useServiceWorkflow) - mismo cuidado de whenLoaded que client.
  stage: Partial<ServiceWorkflowStage> | null
  created_at: string
}

export interface ServiceOrderItemInput {
  name: string
  quantity: number
  unit_price: number
  user_id?: number | null
  notes?: string | null
}

export interface ServiceOrderPayload {
  client_id?: number | null
  /** Texto de la orden - no crea ni busca fichas en el directorio de clientes. */
  client_name?: string | null
  client_phone?: string | null
  client_email?: string | null
  product_id?: number | null
  service_name: string
  total?: number | null
  notes?: string | null
  items?: ServiceOrderItemInput[]
  initial_payment?: number | null
  initial_payment_method?: string | null
}

export interface PayServiceOrderPayload {
  amount: number
  payment_method?: string
  notes?: string | null
}
