import { httpClient } from '@/services/http/client'
import type { AccountingAnnualReport, AccountingMonthlyReport, AccountingPeriodClosing } from '@/types/accounting'

export async function fetchMonthlyReport(year: number, month: number): Promise<AccountingMonthlyReport> {
  const { data } = await httpClient.get<AccountingMonthlyReport>('/accounting/monthly', { params: { year, month } })
  return data
}

export async function fetchAnnualReport(year: number): Promise<AccountingAnnualReport> {
  const { data } = await httpClient.get<AccountingAnnualReport>('/accounting/annual', { params: { year } })
  return data
}

export async function fetchClosings(): Promise<AccountingPeriodClosing[]> {
  const { data } = await httpClient.get<AccountingPeriodClosing[]>('/accounting/closings')
  return data
}

export interface CloseMonthPayload {
  year: number
  month: number
  notes?: string
}

export async function closeMonth(payload: CloseMonthPayload): Promise<AccountingPeriodClosing> {
  const { data } = await httpClient.post<AccountingPeriodClosing>('/accounting/close-month', payload)
  return data
}

// responseType 'blob': mismo motivo que auditLogService.ts - el endpoint
// esta detras de auth:sanctum, asi que no se puede enlazar directo.
export async function fetchMonthlyReportCsv(year: number, month: number): Promise<Blob> {
  const { data } = await httpClient.get('/accounting/monthly/export', { params: { year, month }, responseType: 'blob' })
  return data
}
