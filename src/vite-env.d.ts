/// <reference types="vite/client" />

/** Build en el que se compilo esta pestana (vite.config.ts). */
declare const __APP_BUILD_ID__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_PRIMEVUE_LICENSE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
