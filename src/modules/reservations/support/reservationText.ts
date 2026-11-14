import type { Reservation, ReservationStatus } from '../services/reservationService'

// La hora SIEMPRE en la del negocio (Colombia), no la del navegador: quien
// mira las reservas desde otro huso no debe ver la cena de las 7 a las 8.
const TIMEZONE = 'America/Bogota'

const timeFormat = new Intl.DateTimeFormat('es-CO', { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true })
const dayFormat = new Intl.DateTimeFormat('es-CO', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' })
const isoDayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** "7:00 p. m." */
export function timeLabel(iso: string): string {
  return timeFormat.format(new Date(iso)).replace('p. m.', 'p. m.').replace('a. m.', 'a. m.')
}

/** Hoy como YYYY-MM-DD en la hora del negocio. */
export function todayIso(): string {
  return isoDayFormat.format(new Date())
}

/** Suma (o resta) dias a una fecha YYYY-MM-DD. */
export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return isoDayFormat.format(date)
}

/** "Martes 17 de noviembre", con mayuscula inicial. */
export function dayLabel(day: string): string {
  const text = dayFormat.format(new Date(`${day}T12:00:00-05:00`))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Por confirmar',
  confirmed: 'Confirmada',
  seated: 'En mesa',
  completed: 'Terminada',
  declined: 'Rechazada',
  cancelled: 'Cancelada',
  no_show: 'No llegó',
}

/** Tonos del sistema de color del POS: amber espera, emerald ok, indigo en curso, slate cerrado, red no fue. */
export const STATUS_TONES: Record<ReservationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  seated: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-slate-100 text-slate-600',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
  no_show: 'bg-red-100 text-red-700',
}

/** Las que siguen vivas: ocupan mesa y se pueden accionar. */
export function isLive(reservation: Reservation): boolean {
  return ['pending', 'confirmed', 'seated'].includes(reservation.status)
}

export function whatsappUrl(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '')
  const base = `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
