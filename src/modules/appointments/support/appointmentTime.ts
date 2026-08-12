// Duracion de una cita - opciones fijas de respaldo cuando los servicios
// elegidos no traen duration_minutes, igual que el <select> de duracion del
// legacy (Admin/Appointments/Index.vue). No hay campo de duracion en el
// backend: Appointment solo guarda starts_at/ends_at, la duracion es un
// derivado del cliente para calcular ends_at.
export const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240]

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

// Grilla del calendario semanal.
export const AGENDA_START_HOUR = 7
export const AGENDA_END_HOUR = 21
export const AGENDA_CELL_HEIGHT_PX = 64

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Semana empieza en lunes (dia 1), no domingo (0) - convencion local.
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function combineDateAndTime(dateValue: string, timeValue: string): Date {
  return new Date(`${dateValue}T${timeValue}:00`)
}

export function topOffsetPx(startsAt: Date): number {
  const minutesFromStart = (startsAt.getHours() - AGENDA_START_HOUR) * 60 + startsAt.getMinutes()
  return Math.max(0, (minutesFromStart / 60) * AGENDA_CELL_HEIGHT_PX)
}

export function heightPx(startsAt: Date, endsAt: Date): number {
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60000
  return Math.max(28, (minutes / 60) * AGENDA_CELL_HEIGHT_PX)
}
