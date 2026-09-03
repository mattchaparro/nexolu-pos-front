/** GET /superadmin/system/logs. */

export interface SystemLogEntry {
  timestamp: string
  channel: string
  level: string
  message: string
  exception_class: string | null
  context: Record<string, unknown> | null
  trace: string[]
  trace_lines: number
}

export interface SystemLogFile {
  name: string
  size_bytes: number
  modified_at: string
}

export interface SystemEnvironment {
  app_env: string
  app_debug: boolean
  php_version: string
  laravel_version: string
  timezone: string
  log_channel: string
  /** Si es false, este visor es la ÚNICA fuente de errores en este ambiente. */
  sentry_configured: boolean
}

export interface SystemLogsResponse {
  data: SystemLogEntry[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    /** Se alcanzó el tope de entradas escaneadas: puede faltar historia vieja. */
    truncated: boolean
  }
  files: SystemLogFile[]
  levels: { errors: string[]; logs: string[] }
  environment: SystemEnvironment
}
