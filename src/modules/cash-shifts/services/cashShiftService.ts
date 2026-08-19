import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type {
  CashClosing,
  CashClosingPreview,
  CashShift,
  CloseCashShiftPayload,
  CurrentShiftResponse,
  OpenCashShiftPayload,
  StoreCashClosingPayload,
} from '@/types/cashShift'

export async function fetchCurrentShift(): Promise<CurrentShiftResponse> {
  const { data } = await httpClient.get<CurrentShiftResponse>('/cash-shifts/current')
  return data
}

export async function openCashShift(payload: OpenCashShiftPayload): Promise<CashShift> {
  const { data } = await httpClient.post<CashShift>('/cash-shifts', payload)
  return data
}

export async function closeCashShift(id: number, payload: CloseCashShiftPayload): Promise<CashShift> {
  const { data } = await httpClient.post<CashShift>(`/cash-shifts/${id}/close`, payload)
  return data
}

export async function fetchCashShifts(params: { date?: string; page?: number } = {}): Promise<PaginatedResponse<CashShift>> {
  const { data } = await httpClient.get<PaginatedResponse<CashShift>>('/cash-shifts', { params })
  return data
}

export async function fetchCashClosingPreview(date: string, openingCash?: number): Promise<CashClosingPreview> {
  const { data } = await httpClient.get<CashClosingPreview>('/cash-closings/preview', {
    params: { date, opening_cash: openingCash },
  })
  return data
}

export async function fetchPendingCashClosingDates(): Promise<string[]> {
  const { data } = await httpClient.get<{ dates: string[] }>('/cash-closings/pending-dates')
  return data.dates
}

export async function fetchCashClosings(params: { page?: number } = {}): Promise<PaginatedResponse<CashClosing>> {
  const { data } = await httpClient.get<PaginatedResponse<CashClosing>>('/cash-closings', { params })
  return data
}

export async function storeCashClosing(payload: StoreCashClosingPayload): Promise<CashClosing> {
  const { data } = await httpClient.post<CashClosing>('/cash-closings', payload)
  return data
}

export async function undoCashClosing(id: number): Promise<void> {
  await httpClient.post(`/cash-closings/${id}/undo`)
}
