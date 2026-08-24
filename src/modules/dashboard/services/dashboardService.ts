import { httpClient } from '@/services/http/client'
import type { DashboardShortcut, DashboardSummary, WhatsappOnboarding } from '@/types/dashboard'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await httpClient.get<DashboardSummary>('/dashboard/summary')
  return data
}

export async function updateDashboardShortcuts(shortcuts: DashboardShortcut[]): Promise<DashboardShortcut[]> {
  const { data } = await httpClient.put<{ shortcuts: DashboardShortcut[] }>('/dashboard/shortcuts', { shortcuts })
  return data.shortcuts
}

export async function fetchWhatsappOnboarding(): Promise<WhatsappOnboarding | null> {
  const { data } = await httpClient.get<WhatsappOnboarding | null>('/dashboard/whatsapp-onboarding')
  return data
}

export async function dismissWhatsappOnboarding(): Promise<void> {
  await httpClient.post('/dashboard/whatsapp-onboarding/dismiss')
}
