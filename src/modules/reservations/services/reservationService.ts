import { httpClient } from '@/services/http/client'

// Reservas de mesa (feature `table_reservations`). Refleja
// TableReservationResource, ReservationSettingsController y
// BusinessHoursController de nexolu-pos-api.

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'no_show'

export interface Reservation {
  id: number
  customer_name: string
  customer_phone: string
  customer_email: string | null
  party_size: number
  /** ISO 8601 con la hora del negocio (-05:00). */
  starts_at: string
  ends_at: string
  status: ReservationStatus
  source: 'web' | 'pos'
  notes: string | null
  staff_notes: string | null
  table: { id: number; name: string; capacity: number } | null
  table_id: number | null
  sale_id: number | null
}

export interface ReservationFilters {
  /** YYYY-MM-DD; hoy si falta. */
  date?: string
  from?: string
  to?: string
  status?: ReservationStatus[]
}

export interface ReservationDraft {
  name: string
  phone: string
  email?: string | null
  party_size: number
  /** YYYY-MM-DD HH:mm, en la hora del negocio. */
  starts_at: string
  table_id?: number | null
  notes?: string | null
}

export async function fetchReservations(filters: ReservationFilters = {}): Promise<Reservation[]> {
  const { data } = await httpClient.get<Reservation[]>('/reservations', { params: filters })
  return data
}

export async function fetchReservationSummary(): Promise<{ pending: number; today: number }> {
  const { data } = await httpClient.get<{ pending: number; today: number }>('/reservations/summary')
  return data
}

export async function createReservation(draft: ReservationDraft): Promise<Reservation> {
  const { data } = await httpClient.post<Reservation>('/reservations', draft)
  return data
}

export async function updateReservation(
  id: number,
  payload: Partial<Pick<Reservation, 'customer_name' | 'notes' | 'staff_notes'>>,
): Promise<Reservation> {
  const { data } = await httpClient.patch<Reservation>(`/reservations/${id}`, payload)
  return data
}

export type ReservationAction = 'decline' | 'cancel' | 'no-show' | 'seat'

export async function runReservationAction(id: number, action: ReservationAction): Promise<Reservation> {
  const { data } = await httpClient.post<Reservation>(`/reservations/${id}/${action}`)
  return data
}

export async function confirmReservation(id: number, tableId?: number | null): Promise<Reservation> {
  const { data } = await httpClient.post<Reservation>(
    `/reservations/${id}/confirm`,
    tableId ? { table_id: tableId } : {},
  )
  return data
}

export async function assignReservationTable(id: number, tableId: number): Promise<Reservation> {
  const { data } = await httpClient.post<Reservation>(`/reservations/${id}/assign-table`, { table_id: tableId })
  return data
}

// --- Reglas -----------------------------------------------------------

export interface ReservationRules {
  enabled: boolean
  auto_confirm: boolean
  duration_minutes: number
  slot_interval_minutes: number
  closing_buffer_minutes: number
  min_notice_minutes: number
  max_days_ahead: number
  max_party_size: number
}

export interface ReservationSettingsState {
  reservation: ReservationRules
  hours_configured: boolean
  tables_count: number
  public_url: string
}

export async function fetchReservationSettings(): Promise<ReservationSettingsState> {
  const { data } = await httpClient.get<ReservationSettingsState>('/reservation-settings')
  return data
}

export async function updateReservationSettings(
  reservation: Partial<ReservationRules>,
): Promise<ReservationSettingsState> {
  const { data } = await httpClient.put<ReservationSettingsState>('/reservation-settings', { reservation })
  return data
}

// --- Horario semanal ---------------------------------------------------

export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WeekDay = (typeof WEEK_DAYS)[number]

export const DAY_LABELS: Record<WeekDay, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
}

export interface HoursRange {
  open: string
  close: string
}

export type WeeklyHours = Record<WeekDay, HoursRange[]>

export interface BusinessHoursState {
  weekly_hours: WeeklyHours
  configured: boolean
  /** El texto que ve el público; si no hay horario semanal, el texto libre de antes. */
  summary: string | null
}

export async function fetchBusinessHours(): Promise<BusinessHoursState> {
  const { data } = await httpClient.get<BusinessHoursState>('/business/hours')
  return data
}

export async function updateBusinessHours(weekly: WeeklyHours): Promise<BusinessHoursState> {
  const { data } = await httpClient.put<BusinessHoursState>('/business/hours', { weekly_hours: weekly })
  return data
}
