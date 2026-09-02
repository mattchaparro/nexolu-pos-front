/** Panel de Cron jobs del SuperAdmin (GET /superadmin/cron-jobs). */

export type CronJobStatus = 'success' | 'error'

export interface CronJobRun {
  ran_at: string
  status: CronJobStatus
  output: string | null
  /** 'manual' = alguien le dio "Ejecutar" desde este panel; si no, el scheduler. */
  triggered_by: string
}

export interface CronJob {
  key: string
  name: string
  description: string
  schedule: string
  command: string
  enabled: boolean
  last_run: CronJobRun | null
  recent_logs: CronJobRun[]
}

export interface CronJobRunNowResponse {
  key: string
  status: CronJobStatus
  output: string | null
}
