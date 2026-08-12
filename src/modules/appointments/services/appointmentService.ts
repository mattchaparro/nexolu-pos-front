import { httpClient } from '@/services/http/client'
import type { Appointment, AppointmentPayload, AppointmentStatus, ReschedulePayload } from '@/types/appointment'
import type { PaginatedResponse } from '@/types/pagination'

export interface FetchAppointmentsParams {
  from?: string
  to?: string
  status?: AppointmentStatus | ''
  user_id?: number
  page?: number
}

export async function fetchAppointments(params: FetchAppointmentsParams = {}): Promise<PaginatedResponse<Appointment>> {
  const { data } = await httpClient.get<PaginatedResponse<Appointment>>('/appointments', { params })
  return data
}

export async function fetchAppointment(id: number): Promise<Appointment> {
  const { data } = await httpClient.get<Appointment>(`/appointments/${id}`)
  return data
}

export async function createAppointment(payload: AppointmentPayload): Promise<Appointment> {
  const { data } = await httpClient.post<Appointment>('/appointments', payload)
  return data
}

export async function updateAppointment(id: number, payload: AppointmentPayload): Promise<Appointment> {
  const { data } = await httpClient.put<Appointment>(`/appointments/${id}`, payload)
  return data
}

export async function rescheduleAppointment(id: number, payload: ReschedulePayload): Promise<Appointment> {
  const { data } = await httpClient.post<Appointment>(`/appointments/${id}/reschedule`, payload)
  return data
}

export async function updateAppointmentStatus(id: number, status: AppointmentStatus): Promise<Appointment> {
  const { data } = await httpClient.put<Appointment>(`/appointments/${id}/status`, { status })
  return data
}
