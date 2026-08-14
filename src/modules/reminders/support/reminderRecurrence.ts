import type { ReminderRecurrence } from '@/types/reminder'

const DAY_NAMES_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTH_NAMES_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function addMonthsNoOverflow(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, daysInMonth))
  return d
}

export function recurrenceDescription(recurrence: ReminderRecurrence, anchorDateStr: string | null): string | null {
  if (!recurrence || recurrence === 'none') {
    return null
  }

  if (!anchorDateStr) {
    const generic: Record<string, string> = {
      daily: 'Se repite todos los días',
      weekly: 'Se repite cada semana',
      monthly: 'Se repite cada mes',
      yearly: 'Se repite cada año',
    }
    return generic[recurrence] ?? null
  }

  const [y, m, d] = anchorDateStr.slice(0, 10).split('-').map(Number)
  const fecha = new Date(y, m - 1, d)

  switch (recurrence) {
    case 'daily':
      return 'Se repite todos los días'
    case 'weekly':
      return `Se repite cada semana, todos los ${DAY_NAMES_LONG[fecha.getDay()]}`
    case 'monthly':
      return `Se repite cada mes, el día ${fecha.getDate()}`
    case 'yearly':
      return `Se repite cada año, el ${fecha.getDate()} de ${MONTH_NAMES_LONG[fecha.getMonth()]}`
    default:
      return null
  }
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function toDateOnly(str: string): Date {
  const [y, m, d] = str.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

export function reminderOccursOnDay(reminder: { due_date: string | null; status: string; recurrence: string; end_date: string | null }, day: Date): boolean {
  if (!reminder.due_date) {
    return false
  }

  const base = toDateOnly(reminder.due_date)

  if (reminder.status !== 'pending' || !reminder.recurrence || reminder.recurrence === 'none') {
    return isSameDay(day, base)
  }

  if (day < base) {
    return false
  }
  if (reminder.end_date && day > toDateOnly(reminder.end_date)) {
    return false
  }

  if (reminder.recurrence === 'daily') {
    return true
  }

  if (reminder.recurrence === 'weekly') {
    const diffDays = Math.round((day.getTime() - base.getTime()) / 86400000)
    return diffDays % 7 === 0
  }

  const diffMonths = monthsBetween(base, day)
  if (diffMonths < 0) {
    return false
  }

  if (reminder.recurrence === 'monthly') {
    return isSameDay(addMonthsNoOverflow(base, diffMonths), day)
  }

  if (reminder.recurrence === 'yearly') {
    return diffMonths % 12 === 0 && isSameDay(addMonthsNoOverflow(base, diffMonths), day)
  }

  return false
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
