// Refleja AppointmentResource (app/Http/Resources/Api/V1) en nexolu-pos-api.
import type { Client } from './client'
import type { Product } from './product'
import type { ServiceOrder } from './serviceOrder'

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface AppointmentStaff {
  id: number
  name: string
  full_name: string
}

export interface Appointment {
  id: number
  business_id: number
  client_id: number | null
  product_id: number | null
  user_id: number | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  status_label: string
  notes: string | null
  // whenLoaded en una relacion sin match serializa como recurso con todos
  // los campos en null, no como JSON null - comprobar ?.id != null.
  client: Partial<Client> | null
  service: Partial<Product> | null
  staff: Partial<AppointmentStaff> | null
  service_order: Partial<ServiceOrder> | null
  created_at: string
}

export interface AppointmentServiceLineInput {
  id: number
  custom_price?: number | null
}

export interface AppointmentPayload {
  client_id?: number | null
  services: AppointmentServiceLineInput[]
  user_id?: number | null
  client_name: string
  client_phone?: string | null
  client_email?: string | null
  starts_at: string
  ends_at: string
  notes?: string | null
  initial_payment?: number | null
  payment_method?: string | null
}

export interface ReschedulePayload {
  starts_at: string
  ends_at: string
}
