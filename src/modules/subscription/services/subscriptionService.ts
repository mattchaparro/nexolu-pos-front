import { httpClient } from '@/services/http/client'
import type { SubscriptionCheckoutIntent, SubscriptionCheckoutStatus, SubscriptionStatusResponse } from '@/types/subscription'

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const { data } = await httpClient.get<SubscriptionStatusResponse>('/subscription/status')
  return data
}

export async function initiateSubscriptionCheckout(redirectUrl: string): Promise<SubscriptionCheckoutIntent> {
  const { data } = await httpClient.post<SubscriptionCheckoutIntent>('/subscription/checkout', { redirect_url: redirectUrl })
  return data
}

export async function fetchSubscriptionCheckoutStatus(reference: string): Promise<SubscriptionCheckoutStatus> {
  const { data } = await httpClient.get<SubscriptionCheckoutStatus>(`/subscription/checkout/${reference}`)
  return data
}
