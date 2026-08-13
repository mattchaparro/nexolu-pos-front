import { httpClient } from '@/services/http/client'
import type { DashboardSummary, WhatsappOnboarding } from '@/types/dashboard'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await httpClient.get<DashboardSummary>('/dashboard/summary')
  return data
}

export async function fetchWhatsappOnboarding(): Promise<WhatsappOnboarding | null> {
  const { data } = await httpClient.get<WhatsappOnboarding | null>('/dashboard/whatsapp-onboarding')
  return data
}

export async function dismissWhatsappOnboarding(): Promise<void> {
  await httpClient.post('/dashboard/whatsapp-onboarding/dismiss')
}
