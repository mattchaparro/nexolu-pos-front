import { httpClient } from '@/services/http/client'
import type { StockTransfer, StockTransferPayload } from '@/types/stockTransfer'

interface Paginated<T> {
  data: T[]
  meta?: { current_page: number; last_page: number; total: number }
}

export async function fetchStockTransfers(params: { page?: number }): Promise<Paginated<StockTransfer>> {
  const { data } = await httpClient.get<Paginated<StockTransfer>>('/stock-transfers', { params })
  return data
}

export async function createStockTransfer(payload: StockTransferPayload): Promise<StockTransfer> {
  const { data } = await httpClient.post<StockTransfer>('/stock-transfers', payload)
  return data
}
