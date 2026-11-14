import { httpClient } from '@/services/http/client'

// Refleja PrintingController / PrintAgentResource / PrinterResource /
// PrintJobResource en nexolu-pos-api.

export type PrinterRole = 'kitchen' | 'counter'
export type PrinterConnection = 'network' | 'windows'

export interface PrintSettings {
  /** La factura sale sola al cobrar. */
  auto_print_receipts: boolean
  /** 1 = cliente, 2 = cliente + copia del local. */
  receipt_copies: 1 | 2
  /** Abrir el cajón cuando entra efectivo. */
  open_cash_drawer: boolean
}

export interface PrintAgent {
  id: number
  name: string
  branch_id: number | null
  /** paired = vinculado; pairing = esperando el código; unpaired = sin vincular. */
  status: 'paired' | 'pairing' | 'unpaired'
  is_online: boolean
  version: string | null
  /** Impresoras instaladas en Windows que el agente ve. */
  reported_printers: string[]
  last_seen_at: string | null
  pairing_expires_at: string | null
}

export interface Printer {
  id: number
  name: string
  role: PrinterRole
  connection: PrinterConnection
  address: string
  paper_width: 58 | 80
  is_active: boolean
  branch_id: number | null
  print_agent_id: number | null
}

export interface PrintJob {
  id: number
  type: string
  status: 'pending' | 'claimed' | 'printed' | 'failed'
  sale_id: number | null
  printer_id: number
  printer_name: string | null
  attempts: number
  last_error: string | null
  created_at: string | null
  printed_at: string | null
}

export interface PrintingOverview {
  settings: PrintSettings
  agents: PrintAgent[]
  printers: Printer[]
  failed_jobs: PrintJob[]
}

export interface PrintingStatus {
  has_agent: boolean
  /** Nombres de los equipos que llevan más de un minuto sin reportarse. */
  agents_offline: string[]
  /** Tickets que fallaron hoy. */
  failed_jobs: number
  has_counter_printer: boolean
}

export interface PrinterPayload {
  name: string
  role: PrinterRole
  connection: PrinterConnection
  address: string
  paper_width: 58 | 80
  is_active?: boolean
  branch_id?: number | null
  print_agent_id: number
}

export async function fetchPrintingOverview(): Promise<PrintingOverview> {
  const { data } = await httpClient.get<PrintingOverview>('/printing')
  return data
}

export async function fetchPrintingStatus(): Promise<PrintingStatus> {
  const { data } = await httpClient.get<PrintingStatus>('/printing/status')
  return data
}

export async function updatePrintSettings(payload: Partial<PrintSettings>): Promise<PrintSettings> {
  const { data } = await httpClient.put<{ settings: PrintSettings }>('/printing/settings', payload)
  return data.settings
}

export async function createPrintAgent(payload: {
  name: string
  branch_id?: number | null
}): Promise<{ agent: PrintAgent; pairing_code: string }> {
  const { data } = await httpClient.post<{ agent: PrintAgent; pairing_code: string }>(
    '/printing/agents',
    payload,
  )
  return data
}

export async function regeneratePairingCode(
  agentId: number,
): Promise<{ agent: PrintAgent; pairing_code: string }> {
  const { data } = await httpClient.post<{ agent: PrintAgent; pairing_code: string }>(
    `/printing/agents/${agentId}/pairing-code`,
  )
  return data
}

export async function deletePrintAgent(agentId: number): Promise<void> {
  await httpClient.delete(`/printing/agents/${agentId}`)
}

export async function createPrinter(payload: PrinterPayload): Promise<Printer> {
  const { data } = await httpClient.post<Printer>('/printing/printers', payload)
  return data
}

export async function updatePrinter(
  printerId: number,
  payload: Partial<PrinterPayload>,
): Promise<Printer> {
  const { data } = await httpClient.put<Printer>(`/printing/printers/${printerId}`, payload)
  return data
}

export async function deletePrinter(printerId: number): Promise<void> {
  await httpClient.delete(`/printing/printers/${printerId}`)
}

export async function printTestPage(printerId: number): Promise<PrintJob> {
  const { data } = await httpClient.post<PrintJob>(`/printing/printers/${printerId}/test`)
  return data
}

export async function retryPrintJob(jobId: number): Promise<PrintJob> {
  const { data } = await httpClient.post<PrintJob>(`/printing/jobs/${jobId}/retry`)
  return data
}

/** Reimprime la factura de una venta en la impresora del mostrador. */
export async function reprintSaleReceipt(saleId: number): Promise<PrintJob> {
  const { data } = await httpClient.post<PrintJob>(`/printing/sales/${saleId}/receipt`)
  return data
}
