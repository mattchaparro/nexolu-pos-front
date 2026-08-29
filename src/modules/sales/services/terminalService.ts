import { httpClient } from '@/services/http/client'
import type { PaymentTerminal, TerminalCharge } from '@/types/terminal'

export async function fetchTerminals(): Promise<PaymentTerminal[]> {
  const { data } = await httpClient.get<{ terminals: PaymentTerminal[] }>('/terminals')
  return data.terminals
}

export async function syncTerminals(): Promise<PaymentTerminal[]> {
  const { data } = await httpClient.post<{ terminals: PaymentTerminal[] }>('/terminals/sync')
  return data.terminals
}

export async function startTerminalCharge(
  terminalId: number,
  amount: number,
): Promise<TerminalCharge> {
  const { data } = await httpClient.post<TerminalCharge>('/terminals/charges', {
    terminal_id: terminalId,
    amount,
  })
  return data
}

export async function fetchTerminalCharge(reference: string): Promise<TerminalCharge> {
  const { data } = await httpClient.get<TerminalCharge>(`/terminals/charges/${reference}`)
  return data
}

export async function cancelTerminalCharge(reference: string): Promise<TerminalCharge> {
  const { data } = await httpClient.delete<TerminalCharge>(`/terminals/charges/${reference}`)
  return data
}
