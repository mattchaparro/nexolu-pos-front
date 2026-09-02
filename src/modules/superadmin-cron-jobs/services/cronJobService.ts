import { httpClient } from '@/services/http/client'
import type { CronJob, CronJobRunNowResponse } from '@/types/cronJob'

export async function fetchCronJobs(): Promise<CronJob[]> {
  const { data } = await httpClient.get<{ data: CronJob[] }>('/superadmin/cron-jobs')
  return data.data
}

export async function toggleCronJob(key: string): Promise<void> {
  await httpClient.patch(`/superadmin/cron-jobs/${key}/toggle`)
}

export async function runCronJobNow(key: string): Promise<CronJobRunNowResponse> {
  const { data } = await httpClient.post<CronJobRunNowResponse>(`/superadmin/cron-jobs/${key}/run-now`)
  return data
}
