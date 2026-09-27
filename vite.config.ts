import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

// Identificador de este build. Se compila dentro de la app (__APP_BUILD_ID__)
// y se publica aparte en /version.json: una pestana abierta compara los dos
// para saber si quedo corriendo una version vieja (ver services/appVersion.ts).
const buildId = new Date().toISOString()

function emitBuildVersion(id: string): Plugin {
  return {
    name: 'nexolu-build-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId: id }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), emitBuildVersion(buildId)],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: true,
    // Vite no lee PORT por su cuenta. Respetarlo permite levantar una segunda
    // instancia (otra sesion, otra rama) sin chocar con la que ya ocupa 5173.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
