// Mismo problema y misma solucion que saleDraftStorage.ts (ver ese archivo
// para el detalle completo): el navegador puede descartar la pestaña en
// segundo plano y recargarla de cero al volver (ej. el usuario cambia a
// WhatsApp a copiar el numero del cliente) - sin esto, una cita a medio
// completar se perdia entera. Solo aplica a citas NUEVAS (no edicion de
// una ya existente): restaurar un borrador de edicion arriesga pisar
// cambios que otra persona haya hecho sobre esa misma cita mientras tanto.
import type { AppointmentServiceLineInput } from '@/types/appointment'

const STORAGE_PREFIX = 'nexolu_appointment_draft_'
const MAX_AGE_MS = 12 * 60 * 60 * 1000

export interface AppointmentDraft {
  savedAt: number
  clientId: number | null
  clientName: string
  clientPhone: string
  clientEmail: string
  services: AppointmentServiceLineInput[]
  staffId: number | null
  dateValue: string
  timeValue: string
  durationMinutes: number
  notes: string
}

function storageKey(businessId: number): string {
  return `${STORAGE_PREFIX}${businessId}`
}

export function saveAppointmentDraft(businessId: number, draft: Omit<AppointmentDraft, 'savedAt'>): void {
  try {
    localStorage.setItem(storageKey(businessId), JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // localStorage lleno/deshabilitado - no debe romper el formulario.
  }
}

export function loadAppointmentDraft(businessId: number): AppointmentDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(businessId))
    if (!raw) {
      return null
    }
    const draft = JSON.parse(raw) as AppointmentDraft
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearAppointmentDraft(businessId)
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function clearAppointmentDraft(businessId: number): void {
  try {
    localStorage.removeItem(storageKey(businessId))
  } catch {
    // ver saveAppointmentDraft
  }
}

export function isAppointmentDraftEmpty(
  draft: Pick<AppointmentDraft, 'clientName' | 'clientPhone' | 'services'>,
): boolean {
  return !draft.clientName && !draft.clientPhone && draft.services.length === 0
}
