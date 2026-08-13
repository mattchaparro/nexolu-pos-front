import { httpClient } from '@/services/http/client'
import type { AiMessagePackCheckoutIntent, AiMessagePackCheckoutStatus, AiQuotaState } from '@/types/aiMessagePack'

export async function fetchAiQuotaState(): Promise<AiQuotaState> {
  const { data } = await httpClient.get<AiQuotaState>('/ai/message-packs/state')
  return data
}

export async function initiateAiMessagePackCheckout(redirectUrl: string): Promise<AiMessagePackCheckoutIntent> {
  const { data } = await httpClient.post<AiMessagePackCheckoutIntent>('/ai/message-packs/checkout', { redirect_url: redirectUrl })
  return data
}

export async function fetchAiMessagePackCheckoutStatus(reference: string): Promise<AiMessagePackCheckoutStatus> {
  const { data } = await httpClient.get<AiMessagePackCheckoutStatus>(`/ai/message-packs/checkout/${reference}`)
  return data
}
